// Path: packages/memento-agent/src/continuityAgent.ts

import { Agent } from "@memento-ai/agent";
import { ASSISTANT, ConvSummaryMetaData, USER, type Message } from "@memento-ai/types";
import { createConversation, type ConversationInterface, type Provider, type SendMessageArgs } from "@memento-ai/conversation";
import { MementoDb, type Context } from "@memento-ai/memento-db";
import { get_csum_mementos } from "@memento-ai/postgres-db";
import { inspect } from "bun";
import { registerFunction, type FunctionRegistry, extractFunctionCalls, getRegistryDescription, invokeFunctions } from "@memento-ai/function-calling";
import Handlebars from "handlebars";
import TraceError from "trace-error";
import type { CommonQueryMethods } from "slonik";
import type { FunctionCallRequest, FunctionCallResult } from "@memento-ai/function-calling";
import debug from "debug";

import updateSummaries from '@memento-ai/function-calling/src/functions/updateSummaries';
import { stripCommonIndent } from "@memento-ai/utils";

const dlog = debug("continuityAgent");

Handlebars.registerHelper('obj', function(context) {
    return Bun.inspect(context);
});


const template = Handlebars.compile(`
## Instructions
{{system}}

## Functions
Below is the formal definition of the a function you must use to accomplish your task. You issue a request to the
Memento system to execute a function by providing a JSON formatted FunctionCallRequest object with the
function name and input parameters. The system will respond with a FunctionCallResult object containing
the result of executing the function.

Your response will not be seen by the user so you should not include any helpful commentary.
If you decide that invoking the function is not neccesary at this time, you can simply respond with
"No action required."

If you do decide to invoke the function, the function call request JSON object is all that you should include
in your response.

{{functions}}

NOTE: the FunctionCallRequest object must be placed in a code fence using the keyword \`function\` as the
language specifier.

This is a full example an updateSummaries request:

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

NOTE: There is no direct way to delete a csum mem. To remove a csum mem, you should unpin it and update the priority to 0.
You will only see csum mems with priority > 0. The MementoAgent will only see pinned csum mems. The set of pinned csum mems
that the MementoAgent sees may be a subset of all pinned csum mems selected by priority.

## Synopses
{{#each synopses}}
- {{this}}
{{/each}}

## CSUM Mementos
The following are a selection of the conversation summary mems in the database. The MementoAgent will only see pinned
mems, but you can see both pinned and unpinned mems. You may unpin mems that are no longer relevant, or repin mementos
after they have become relevant again.

{{#each mementos}}
- {
    metaid: "{{metaid}}"
    priority: {{priority}}
    pinned: {{pinned}}
    content: "{{content}}"
}
{{/each}}
`);

export interface ProviderAndModel {
    provider: Provider;
    model: string;
}

const defaultProviderAndModel: ProviderAndModel = {
    provider: 'anthropic',
    model: 'haiku'
}

export interface ContinuityAgentArgs {
    db: MementoDb;
    providerAndModel?: ProviderAndModel;
}

export class ContinuityAgent extends Agent {
    constructor(args: ContinuityAgentArgs) {
        const { provider, model } = args.providerAndModel ?? defaultProviderAndModel;
        const conversation: ConversationInterface = createConversation(provider, {
            model, temperature: 0.0, max_response_tokens: 1024, logging: { name: 'continuity'} });
        const { db } = args;
        const prompt = ContinuityAgent.makePrompt();
        var registry: FunctionRegistry = {};
        registerFunction(registry, updateSummaries);
        super({ conversation, db, prompt, registry });
    }

    async analyze(): Promise<Message> {
        const maxMessagePairs: number = 5;  // TODO: configure this from command line
        const priorConveration: Message[] = await this.DB.getConversation(maxMessagePairs);
        return this.sendMessage({ prompt: this.prompt as string, messages: priorConveration });
    }

    async sendMessage({ messages }: SendMessageArgs): Promise<Message>
    {
        // The ContinuityAgent should be given *almost* the same message history that the MementoAgent was given.
        // The MementoAgnent is always given an odd number of messages (not counting system) with the last message
        // being from the user. The ContinuityAgent can only be given an even number of messages from the conversation,
        // with the last message being from the assistant. However, the LLM model expects the last message to be from the user
        // and to be the primary message to respond to. So, we will create a user message that is essentially part of
        // the system prompt.

        const numConvMessages = messages.length - (messages[0].role !== USER ? 1 : 0);

        // For actual use, all of the following are errors.
        // But for testing, we might want to bypass use of this agent in some scenarios,
        // so it could be that we should just return a synthetic message.
        if (numConvMessages === 0) {
            throw new Error('The ContinuityAgent must be given at least one message exchange.');
        }

        if (numConvMessages % 2 !== 0) {
            console.log(messages);
            throw new Error('The ContinuityAgent must be given an even number of messages.');
        }
        if (messages[messages.length - 1].role !== ASSISTANT) {
            throw new Error('The last message in the conversation history must be from the assistant.');
        }
        if (this.registry === undefined) {
            throw new Error('The ContinuityAgent registry is not set.');
        }
        if (this.registry.updateSummaries === undefined) {
            throw new Error('The ContinuityAgent registry does not have an updateSummaries function.');
        }

        const functions: string = getRegistryDescription(this.Registry);

        const synopses: string[] = await this.DB.getSynopses(1000);

        const mementos: ConvSummaryMetaData[] = await this.getMementos();
        // const mementos: string = mementoData.map(memento => {
        //     return inspect(memento);
        // }).join("\n");

        const prompt = template({system: this.Prompt, functions, mementos, synopses});

        messages.push({role: USER, content: ContinuityAgent.makeLastUserMessage()});
        dlog('sendMessage input:', { prompt, messages });

        const assistantMessage = await this.conversation.sendMessage({ prompt, messages });
        dlog('sendMessage response:', assistantMessage);

        // Check if the assistant's response contains a function call -- it should much of the time
        const calls: FunctionCallRequest[] = Array.from(extractFunctionCalls(assistantMessage.content));
        dlog("Extracted function calls:", inspect(calls));
        const context: Context = { pool: this.DB.pool};
        const functionResults: FunctionCallResult[] = await invokeFunctions({registry: this.Registry, calls, context});
        dlog("Extracted function results:", inspect(functionResults));

        // TODO: if the function results include an error, it should be reported back to the continuity
        // agent to give it a chance to correct the function request.

        // In MementoAgent we return the function result back to the agent,
        // but here we should not do that. But we should return both the assistant message and the function results.
        const content = assistantMessage.content + '\n\n' + functionResults.map(result => inspect(result)).join('\n\n');
        return { role: ASSISTANT, content };
    }

    async getMementos(): Promise<ConvSummaryMetaData[]> {
        let mementoData: ConvSummaryMetaData[] = [];
        await this.DB.readonlyPool.connect(async (conn: CommonQueryMethods) => {
            try {
                dlog('getMementos: connected to readonly pool, calling get_csum_mementos')
                mementoData = await get_csum_mementos(conn);
            }
            catch (e) {
                const err = new TraceError('Failed get_csum_mementos', e as Error);
                console.error(err.toString());
                // fall through and allow empty array to be returned.
            }
        });
        return mementoData;
    }

    static makePrompt(): string {
        return stripCommonIndent(`
        You are the ContinuityAgent, responsible for maintaining high-level continuity and context for the MementoAgent over extended conversations.

        Your task is to analyze the conversation history to determine if high-level summaries need to be created or updated
        using the updateSummaries function.

        You will receive indirect assistance from the SynopsisAgent, which produces a short synopsis of each conversational exchange.
        You should avoid redundancies with the synopses. Note that you (and the MementoAgent) are given access to the synopses,
        but the SynopsisAgent is not given access to your summaries, so it is your job to avoid redundancies.

        The result of your work will change the summaries visible to the MementoAgent the next time a messasge from the user
        is delivered to the assistant. Your goal is to provide context to the MementoAgent to create continuity
        across conversations that may span hundreds of exchanges, even though only a few of the most recent exchanges are made
        available to the MementoAgent.
        `);
    }

    static makeLastUserMessage(): string {
        const content = stripCommonIndent(`
        Based on the recent conversation exchanges and the existing pinned/unpinned conversation summary (csum) mems shown above, perform the following analysis:

        1. Identify any new major topics or subtopics that were introduced and create new csum mems following the <category>/<topic> naming convention. Categories can include now, soon, goal, dev, doc, etc. Aim for ~50 token summaries.

        2. Check if any important decisions were made, or if there were significant clarifications on existing topics that alter the context. Update the relevant csum mems accordingly.

        3. Remove redundant or obsolete information from existing csum mems.

        4. For topics discussed extensively, consider increasing the priority score of those csum mems.

        5. Any csum mems no longer relevant after this conversation should be unpinned or deleted.

        When creating new csum mems, prefer starting a new one over updating an existing vaguely related one. But use your judgment.

        To make updates, use the updateSummaries function, providing an array of updates including:
        - metaId: The category/topic ID of the csum mem
        - content: New content (omit if just changing pinned/priority)
        - pinned: True if this csum should be pinned, false to unpin
        - priority: An integer score for the relative priority

        Please also briefly explain your reasoning for each update. If no updates are needed, respond with "No action required."
        `);
        return content;
    }
}
