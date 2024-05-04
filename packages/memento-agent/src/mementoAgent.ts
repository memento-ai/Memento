// Path: packages/memento-agent/src/mementoAgent.ts
import {  type SendMessageArgs } from "@memento-ai/conversation";
import { functionCallingInstructions } from "./dynamicPrompt";
import { Agent, type AgentArgs, type SendArgs } from "@memento-ai/agent";
import { extractFunctionCalls, invokeFunctions, type FunctionCallRequest, type FunctionCallResult, functionCallResultAsString, categorizeExtractedFunctionCalls, isFunctionError, type FunctionError, type CategorizedFunctionCalls } from "@memento-ai/function-calling";
import { getDatabaseSchema } from "@memento-ai/postgres-db";
import { registry } from "@memento-ai/function-calling";
import { USER, type Message, type Role, type Memento } from "@memento-ai/types";
import { Writable } from "node:stream";
import c from 'ansi-colors';
import debug from "debug";
import Handlebars from "handlebars";
import type { Context, SimilarityResult } from "@memento-ai/memento-db";
import type { SynopsisAgent } from "@memento-ai/synopsis-agent";
import { mementoCoreSystemPrompt } from "./mementoCoreSystemPrompt";
import { mementoPromptTemplate, type MementoPromptTemplateArgs } from "./mementoPromptTemplate";

Handlebars.registerHelper('obj', function(context) {
    return Bun.inspect(context);
});

const dlog = debug("mementoAgent");
const mlog = debug("mementoAgent:mem");
const clog = debug("mementoAgent:continuity");

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

    async retrieveContext(): Promise<MementoPromptTemplateArgs> {
        const pinnedCsumMems: Memento[] = await this.DB.searchPinnedCsumMems(this.max_csum_tokens);
        const synopses: string[] = await this.DB.getSynopses(this.max_synopses_tokens);
        const selectedMems: SimilarityResult[] = await this.DB.searchMemsBySimilarity(this.lastUserMessage, this.max_similarity_tokens);
        const totalTokens: number = selectedMems.reduce((acc, mem) => acc + mem.tokens, 0);
        const continuityResponseContent: string | null = this.continuityResponseContent;
        const functions = functionCallingInstructions(this.databaseSchema);

        mlog(`selectedMems results: length: ${selectedMems.length}, total tokens: ${totalTokens}`);

        return {
            system: mementoCoreSystemPrompt,
            functions,
            databaseSchema: this.databaseSchema,
            pinnedCsumMems,
            synopses,
            selectedMems,
            continuityResponseContent
        };
    }

    async getAsyncErrorResults(): Promise<FunctionError[]> {

        let asyncErrorResults: FunctionError[] = [];
        let asyncResults = await this.asyncResults;
        if (asyncResults.length > 0) {
            asyncErrorResults = asyncResults.filter(result => isFunctionError(result)) as FunctionError[];
        }

        return asyncErrorResults;
    }

    checkForFunctionResults(content: string): void {
        if (!content.startsWith(FUNCTION_RESULT_HEADER)) {
            this.lastUserMessage = content;
        }
    }

    checkForFunctionCalls(content: string): CategorizedFunctionCalls {
        const functionCalls: FunctionCallRequest[] = Array.from(extractFunctionCalls(content));
        const categorizedCalls = categorizeExtractedFunctionCalls(functionCalls);
        dlog("Extracted function calls:", categorizedCalls);
        return categorizedCalls;
    }

    async invokeSyncAndAsyncFunctions(assistantMessage: Message): Promise<string> {
        const context: Context = { readonlyPool: this.DB.readonlyPool, pool: this.DB.pool};

        const { syncCalls, asyncCalls, badCalls } = this.checkForFunctionCalls(assistantMessage.content);

        const syncResults: FunctionCallResult[] = await invokeFunctions({registry: this.Registry, calls: syncCalls, context});
        dlog("Extracted function results:", syncResults);

        const asyncErrorResults: FunctionError[] = await this.getAsyncErrorResults();
        if (asyncCalls) {
            // Invoke but do not await the result
            this.asyncResults = invokeFunctions({registry: this.Registry, calls: asyncCalls, context});
        }

        const functionResultContent = (syncResults.concat(badCalls).concat(asyncErrorResults)).map((result: FunctionCallResult) => {
            const header = `${FUNCTION_RESULT_HEADER} ${result.name}\n`;
            return header + `\'\'\'result\n${functionCallResultAsString(result)}\n\'\'\'`;
        }).join('\n\n');

        return functionResultContent;
    }

    async send({ content }: SendArgs): Promise<Message> {
        this.checkForFunctionResults(content);

        const role : Role = USER;
        const newMessage = {content, role};
        // Get the prior conversation before adding the new message
        const maxMessagePairs: number = 5;  // TODO: configure this from command line
        const priorConveration: Message[] = await this.DB.getConversation(maxMessagePairs);

        await this.DB.addConversationMem(newMessage);

        const tempateArgs: MementoPromptTemplateArgs = await this.retrieveContext();
        const prompt = mementoPromptTemplate(tempateArgs);

        const messages: Message[] = [...priorConveration, newMessage];

        // --- Send the message to the assistant here ---
        let assistantMessage: Message = await this.sendMessage({messages, prompt});

        // Check if the assistant's response contains a function call
        const functionResultContent = await this.invokeSyncAndAsyncFunctions(assistantMessage)

        if (functionResultContent !== "")
        {
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
