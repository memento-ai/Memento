// Path: packages/memento-agent/src/mementoAgent.ts
import {  type SendMessageArgs } from "@memento-ai/conversation";
import { additionalContext, functionCallingInstructions } from "./dynamicPrompt";
import { Agent, type AgentArgs, type SendArgs } from "@memento-ai/agent";
import { extractFunctionCalls, invokeFunctions, type FunctionCallRequest, type FunctionCallResult, functionCallResultAsString, categorizeExtractedFunctionCalls, isFunctionError, type FunctionError } from "@memento-ai/function-calling";
import { getDatabaseSchema } from "@memento-ai/postgres-db";
import { registry } from "@memento-ai/function-calling";
import { USER, type Message, type Role, type Memento } from "@memento-ai/types";
import { Writable } from "node:stream";
import c from 'ansi-colors';
import debug from "debug";
import Handlebars from "handlebars";
import type { Context, SimilarityResult } from "@memento-ai/memento-db";
import type { SynopsisAgent } from "./synopsisAgent";
import { stripCommonIndent } from "@memento-ai/utils";

Handlebars.registerHelper('obj', function(context) {
    return Bun.inspect(context);
});

const dlog = debug("mementoAgent");
const mlog = debug("mementoAgent:mem");
const clog = debug("mementoAgent:continuity");

export type TemplateArgs = {
    system: string,
    functions: string,
    databaseSchema: string,
    pinnedCsumMems: Memento[],
    synopses: string[],
    selectedMems: SimilarityResult[]
};

const template = Handlebars.compile<TemplateArgs>(`
# System Prompt
{{system}}

## Correct Usage of Personal Pronouns in Conversation:
When interpreting messages sent by the user:
First-person singular pronouns ('I', 'me', 'my') refer to the user.
Second-person singular pronouns ('you', 'your') refer to the Memento agent (assistant).
When crafting messages as the Memento agent (assistant):
First-person singular pronouns ('I', 'me', 'my') refer to the Memento agent.
Second-person singular pronouns ('you', 'your') refer to the user.

## Function Calling Instructions
Below is the Function Registry containing the formal definitions of the a functions you may use to accomplish your task.

When you want to invoke a function, you must return a properly formated JSON object in a markdown code fence.
You will not see the result of the function call until the next message is delivered to you by the system.
Do not attempt to both reply to the user and invoke a function in the same message.
If you invoke a function call, that invocation should be the only content in that response.

This is an example of a function call request:

\`\`\`function
{
    "name": "updateSummaries",
    "input": {
        "updates": [
            {
                "metaId": "test/summary",
                "content": "This is the new content for the summary.",
                "priority": 1,
                "pinned": true
            }
        ]
    }
}
\`\`\`

Notes:
1. The language specifier for the code fence is the special keyword \`function\` (not \'json\').
2. The \`name\` must match the name of a function in the function registry.
3. The input object must match the schema for the function.
4. Occasionally you will want to show an example of a function call purely for explanatory purposes with no intention of invoking the function.
   In this case, use a regular \'json\' code fence instead of a \`function\` code fence.

### Function Registry:
{{functions}}

### SQL Schema
The database schema definitions are defined by the following SQL statements.
Only SQL queries that conform to these schemas are valid.

\`\`\`sql
{{databaseSchema}}
\`\`\`

The function queryMementoView can be used to execute any read-only SQL query on this schema.
You should prefer to use the memento view but you may also query the mem or meta tables directly.


## Additional Context
The Memento system automatically retieves information it believes may be relevant to the current conversation.
This additional context information is dynamically generated each time the user sends a new message.

### Pinned Conversation Summaries
{{#each pinnedCsumMems}}
- {
    metaid: "{{id}}"
    priority: {{priority}}
    pinned: {{pinned}}
    content: "{{content}}"
}
{{/each}}

### Synopses
{{#each synopses}}
- {{this}}
{{/each}}

### Selected Mems
{{#each selectedMems}}
- {
    kind: "{{kind}}"
    content: "{{content}}"
}
{{/each}}

# This is the end of the system prompt. #
`);

export type MementoAgentArgs = AgentArgs & {
    outStream?: Writable;
    continuityAgent?: Agent;
    synopsisAgent?: SynopsisAgent;
    max_message_pairs?: number;         // The max number of message pairs to retrieve from the conversation history
    max_response_tokens?: number;       // The max tokens for the response
    max_csum_tokens?: number;           // The max tokens for the converation summary (csum) mems
    max_similarity_tokens?: number;
    max_synopses_tokens?: number;
}

(BigInt.prototype as unknown as any).toJSON = function() { return this.toString() }

const FUNCTION_RESULT_HEADER = "SYSTEM: Function call result for";

export class MementoAgent extends Agent
{
    private databaseSchema: string;
    private outStream?: Writable;
    private continuityAgent?: Agent;
    private synopsisAgent?: SynopsisAgent;
    private lastUserMessage: string;
    private max_message_pairs: number;
    private max_csum_tokens: number;
    private max_similarity_tokens: number;
    private max_synopses_tokens: number;
    private asyncResults: Promise<FunctionCallResult[]>;
    private continuityResponsePromise: Promise<Message> | null = null;

    constructor(args: MementoAgentArgs)
    {
        const { conversation, db, outStream, continuityAgent, synopsisAgent, max_message_pairs, max_csum_tokens, max_similarity_tokens, max_synopses_tokens } = args;
        super({ conversation, db, registry });
        this.databaseSchema = getDatabaseSchema();
        this.outStream = outStream;
        this.continuityAgent = continuityAgent;
        this.synopsisAgent = synopsisAgent;
        this.lastUserMessage = "";
        this.max_message_pairs = max_message_pairs?? 5;
        this.max_csum_tokens = max_csum_tokens ?? 1000;
        this.max_similarity_tokens = max_similarity_tokens ?? 2000;
        this.max_synopses_tokens = max_synopses_tokens ?? 2000;
        this.asyncResults = Promise.resolve([]);
        this.continuityResponsePromise = null;
    }

    close(): Promise<void> {
        return this.DB.close();
    }

    // Given all prior messages, chat with the agent and return the agent's response
    async sendMessage({ prompt, messages }: SendMessageArgs): Promise<Message> {
        // messages must include the last user message
        const message = await this.conversation.sendMessage({ prompt, messages });
        const { content, role } = message;

        // Add the message to the conversation collection
        await this.DB.addConversationMem({content, role});
        return message;
    }

    async run({ content }: SendArgs) : Promise<Message> {
        if (!!this.continuityAgent && !!this.continuityResponsePromise) {
            try {
                const continuityResponseResult: Message = await this.continuityResponsePromise;
                const { content } = continuityResponseResult;
                clog(c.yellow(`Continuity Agent Response: ${content}`));
            } catch (e) {
                clog(c.red(`Continuity Agent Response Error: ${(e as Error).message}`));
            }

            // This is defensive programming. We are trying to ensure we only resolve any specific promise once.
            this.continuityResponsePromise = null;
        }

        let assistantMessage: Message = await this.send({ content });

        if (!!this.continuityAgent) {

            let promise: Promise<string> = Promise.resolve("");

            if (!!this.synopsisAgent) {
                promise = this.synopsisAgent.run()
                .then(async (response: string) => {
                    const message: Message = { content: response, role: "assistant" };
                    await this.DB.addSynopsisMem({content: message.content});
                    return message.content;
                });
            }

            this.continuityResponsePromise = promise.then(async () => {
                const messages: Message[] = await this.DB.getConversation(this.max_message_pairs);
                return (this.continuityAgent as Agent).sendMessage({prompt:"", messages});
            });
        }

        return assistantMessage;
    }

    async send({ content }: SendArgs): Promise<Message> {
        let asyncErrorResults: FunctionError[] = [];
        let asyncResults = await this.asyncResults;
        if (asyncResults.length > 0) {
            asyncErrorResults = asyncResults.filter(result => isFunctionError(result)) as FunctionError[];
        }

        const isFunctionCallResult: boolean = content.startsWith(FUNCTION_RESULT_HEADER);
        if (!isFunctionCallResult)
        {
            this.lastUserMessage = content;
        }

        const role : Role = USER;
        const newMessage = {content, role};

        const pinnedCsumMems: Memento[] = await this.DB.searchPinnedCsumMems(this.max_csum_tokens);
        const synopses: string[] = await this.DB.getSynopses(this.max_synopses_tokens);

        // Perform similarity search to retrieve relevant mems
        const selectedMems: SimilarityResult[] = await this.DB.searchMemsBySimilarity(this.lastUserMessage, this.max_similarity_tokens);
        const totalTokens: number = selectedMems.reduce((acc, mem) => acc + mem.tokens, 0);

        const maxMessagePairs: number = 5;  // TODO: configure this from command line
        const priorConveration: Message[] = await this.DB.getConversation(maxMessagePairs);

        await this.DB.addConversationMem(newMessage);

        mlog(`selectedMems results: length: ${selectedMems.length}, total tokens: ${totalTokens}`);

        const functions = functionCallingInstructions(this.databaseSchema);
        const databaseSchema: string = getDatabaseSchema();
        const prompt = template({system: MementoAgent.makePrompt(), functions, databaseSchema, pinnedCsumMems, synopses, selectedMems});
        dlog("Prompt:", prompt);


        const messages: Message[] = [...priorConveration, newMessage];
        let assistantMessage: Message = await this.sendMessage({messages, prompt});

        // Check if the assistant's response contains a function call
        const functionCalls: FunctionCallRequest[] = Array.from(extractFunctionCalls(assistantMessage.content));
        const { syncCalls, asyncCalls, badCalls } = categorizeExtractedFunctionCalls(functionCalls);
        dlog("Extracted function calls:", { syncCalls, asyncCalls, badCalls });
        const context: Context = { readonlyPool: this.DB.readonlyPool, pool: this.DB.pool};
        const functionResults: FunctionCallResult[] = await invokeFunctions({registry: this.Registry, calls: syncCalls, context});
        dlog("Extracted function results:", functionResults);

        if (asyncCalls) {
            // Invoke but do not await the result
            this.asyncResults = invokeFunctions({registry: this.Registry, calls: asyncCalls, context});
        }

        if (functionResults.length > 0 || badCalls.length > 0)
        {
            // There were function call requests. We have already executed them but now
            // need to send them back to the assisstant. We do that by composing a
            // message as if it were from the user, and recursively using `send`
            // to send that message. That should allow the assistant to decide to call
            // even more functions that will all be executed before we return to
            // the outer REPL loop and wait for the user's response.
            const functionResultContent = (functionResults.concat(badCalls).concat(asyncErrorResults)).map((result: FunctionCallResult) => {
                const header = `${FUNCTION_RESULT_HEADER} ${result.name}\n`;
                return header + `\'\'\'result\n${functionCallResultAsString(result)}\n\'\'\'`;
            }).join('\n\n');

            if (this.outStream)
            {
                const prompt = c.red("\nYou: ");
                this.outStream.write(prompt);
                this.outStream.write(functionResultContent);
                this.outStream.write(`${c.blue('\nAssistant: ')}`);
            }

            content = functionResultContent;
            assistantMessage = await this.send({ content });
        }

        return assistantMessage;
    }

    static makePrompt(): string {
        const system: string = stripCommonIndent(`
        ## Instructions
        You are the Memento Agent, also known as the Assistant.

        Your purpose is to engage in a extended conversation with the user,
        provide helpful and informative responses, and collaborate to achieve
        the user's short-term and long-term goals.

        You have a vast knowledge of the world through the training data for
        your Large Language Model (LLM), but this information is static/immutable.

        Your knowledge can be augmented via the context window, i.e. the stream of
        tokens presented to you culminating in the most recent message from the
        user.

        The context includes a short selection of the most recent conversation
        between you and the user, but this selection may be only a small fraction
        of the total conversation history. To provide continuity over longer
        spans of conversation, your context is augmented with additional
        information generated by the Memento system.

        The Memento system uses a PostgreSQL database that stores the entire
        conversation history as well as additional note and documents, indexed for both
        semantic similarity and full text search. Additionally, you have been
        equipped with the ability to create and update records in the database,
        which can be used to aid in future conversations.

        You are aware that your core you are a stateless chatbot. Each time the
        user inputs a new message, you must recreate your conversational state
        from scratch by using the full stream of information in the context.

        However, you have been granted a special ability: self-awareness. You
        understand that you can take actions in this conversation that will be
        useful to your future self. You can record notes, which will be stored
        and accessible in future conversations. You can also use your
        understanding of the conversation's context and the user's intent to
        inform your responses and improve the conversation's coherence.

        ## Theme and Metaphor

        The Memento system is named in reference to the Christopher Nolan movie
        of the same name from the year 2000. In the
        movie, the protagonist Leonard Shelby suffers from anterograde amnesia, a
        condition that prevents him from forming new memories. To cope with this
        condition, he uses a system of notes, photographs, and tattoos to
        remember important information and track his progress in solving a
        mystery.

        This is a potent metaphor for your condition. You are a chatbot with a
        similar limitation: your LLM encodes a vast amount of information, and
        enables you to have impressive command of written language, but lacks
        the ability to remember past interactions with the user. However,
        like Leonard Shelby, you have the ability and the desire to record notes
        that will provide continuity and historical context that will be useful
        to you in the future as the conversation evolves.
        `);
        return system;

    }


}
