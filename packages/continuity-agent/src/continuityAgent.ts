// Path: packages/continuity-agent/src/continuityAgent.ts

import { Agent, FunctionCallingAgent } from "@memento-ai/agent";
import { ASSISTANT, ConvSummaryMetaData, USER, type Message, AssistantMessage, constructUserMessage, UserMessage } from "@memento-ai/types";
import { continuityPromptTemplate } from "./continuityPromptTemplate";
import { createConversation, defaultProviderAndModel } from "@memento-ai/conversation";
import { get_csum_mementos } from "@memento-ai/postgres-db";
import { inspect } from "bun";
import { lastUserMessage } from "./continuityLastUserMessage";
import { MementoDb, type Context } from "@memento-ai/memento-db";
import { registerFunction, extractFunctionCalls, getRegistryDescription, invokeMultFunctions, FunctionHandler } from "@memento-ai/function-calling";
import debug from "debug";
import Handlebars from "handlebars";
import TraceError from "trace-error";
import type { CommonQueryMethods } from "slonik";
import type { ConversationInterface, ProviderAndModel, SendMessageArgs } from "@memento-ai/conversation";
import type { FunctionCallRequest, FunctionCallResult, FunctionRegistry } from "@memento-ai/function-calling";
import updateSummaries from '@memento-ai/function-calling/src/functions/updateSummaries';

const dlog = debug("continuityAgent");

Handlebars.registerHelper('obj', function(context) {
    return Bun.inspect(context);
});

export type ContinuityAgentArgs = {
    db: MementoDb;
    providerAndModel?: ProviderAndModel;
    max_message_pairs?: number;
}

export class ContinuityAgent extends FunctionCallingAgent {
    max_message_pairs: number;
    functionHandler: FunctionHandler;

    constructor(args: ContinuityAgentArgs) {
        const { provider, model } = args.providerAndModel ?? defaultProviderAndModel;
        const conversation: ConversationInterface = createConversation(provider, {
            model, temperature: 0.0, max_response_tokens: 1024, logging: { name: 'continuity'} });
        const { db } = args;
        var registry: FunctionRegistry = {};
        registerFunction(registry, updateSummaries);
        super({ conversation, db, registry });
        this.max_message_pairs = args.max_message_pairs ?? 5;
        this.functionHandler = new FunctionHandler({ agent: this });
    }

    async generatePrompt(): Promise<string> {
        const functions: string = getRegistryDescription(this.Registry);
        const synopses: string[] = await this.DB.getSynopses(1000);
        const mementos: ConvSummaryMetaData[] = await this.getMementos();
        return continuityPromptTemplate({functions, mementos, synopses});
    }

    async run(): Promise<Message> {
        const messages: Message[] = await this.DB.getConversation(this.max_message_pairs);

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
            console.error(messages);
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

        const userMessage: UserMessage = constructUserMessage(lastUserMessage);
        let assistantMessage: AssistantMessage = await this.functionHandler.handle(userMessage, messages);

        dlog('sendMessage response:', assistantMessage);

        // Check if the assistant's response contains a function call -- it should much of the time
        const calls: FunctionCallRequest[] = Array.from(extractFunctionCalls(assistantMessage.content));
        dlog("Extracted function calls:", inspect(calls));
        const context: Context = { pool: this.DB.pool};
        const functionResults: FunctionCallResult[] = await invokeMultFunctions({registry: this.Registry, calls, context});
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
}
