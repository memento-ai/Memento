// Path: packages/memento-agent/src/mementoAgent.ts
import {  type SendMessageArgs } from "@memento-ai/conversation";
import { functionCallingInstructions } from "./dynamicPrompt";
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
import { mementoPromptTemplate } from "./mementoPromptTemplate";
import { mementoCoreSystemPrompt } from "./mementoCoreSystemPrompt";

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
    continuityResponseContent: string | null
};

const template = Handlebars.compile<TemplateArgs>(mementoPromptTemplate);

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
    private continuityResponseContent: string | null = null;

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
        this.continuityResponseContent = null;
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
                const result = await this.continuityResponsePromise;
                this.continuityResponseContent = result.content;
                clog(c.yellow(`Continuity Agent Response: ${this.continuityResponseContent}`));
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
        const tempateArgs: TemplateArgs = {
            system: mementoCoreSystemPrompt,
            functions, databaseSchema,
            pinnedCsumMems,
            synopses,
            selectedMems,
            continuityResponseContent: this.continuityResponseContent
        };
        const prompt = template(tempateArgs);

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
}
