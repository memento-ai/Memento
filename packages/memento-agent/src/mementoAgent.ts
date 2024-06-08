// Path: packages/memento-agent/src/mementoAgent.ts

import { FunctionCallingAgent, type AgentArgs, type SendArgs } from "@memento-ai/agent";
import { awaitAsyncAgentActions, startAsyncAgentActions } from "./asyncAgentGlue";
import { getDatabaseSchema, type ID } from "@memento-ai/postgres-db";
import { mementoPromptTemplate, type MementoPromptTemplateArgs } from "./mementoPromptTemplate";
import { FunctionHandler, registry, type FunctionCallResult } from "@memento-ai/function-calling";
import { retrieveContext } from "./retrieveContext";
import { constructUserMessage } from "@memento-ai/types";
import type { Message, UserMessage, AssistantMessage } from "@memento-ai/types";
import { Writable } from "node:stream";
import type { SynopsisAgent } from "@memento-ai/synopsis-agent";
import type { ResolutionAgent } from "@memento-ai/resolution-agent";

export type MementoAgentArgs = AgentArgs & {
    outStream?: Writable;
    resolutionAgent?: ResolutionAgent;
    synopsisAgent?: SynopsisAgent;
    max_message_pairs?: number;
    max_response_tokens?: number;
    max_similarity_tokens?: number;
    max_synopses_tokens?: number;
}

export type MessagePair = {
    user: UserMessage;
    assistant: AssistantMessage;
}

export class MementoAgent extends FunctionCallingAgent
{
    databaseSchema: string;
    outStream?: Writable;
    resolutionAgent?: ResolutionAgent;
    synopsisAgent?: SynopsisAgent;
    max_message_pairs: number;
    max_similarity_tokens: number;
    max_synopses_tokens: number;
    asyncResults: Promise<FunctionCallResult[]>;
    functionHandler: FunctionHandler;
    asyncResponsePromise: Promise<string>;

    constructor(args: MementoAgentArgs)
    {
        const { conversation, db, outStream, resolutionAgent, synopsisAgent, max_message_pairs, max_similarity_tokens, max_synopses_tokens } = args;
        super({ conversation, db, registry });
        this.databaseSchema = getDatabaseSchema();
        this.outStream = outStream;
        this.resolutionAgent = resolutionAgent;
        this.synopsisAgent = synopsisAgent;
        this.max_message_pairs = max_message_pairs?? 5;
        this.max_similarity_tokens = max_similarity_tokens ?? 2000;
        this.max_synopses_tokens = max_synopses_tokens ?? 2000;
        this.asyncResults = Promise.resolve([]);
        this.functionHandler = new FunctionHandler({ agent: this });
        this.asyncResponsePromise = Promise.resolve("");
    }

    close(): Promise<void> {
        return this.DB.close();
    }

    // Create the prompt, overriden from the Agent base class
    async generatePrompt(): Promise<string> {
        const context: MementoPromptTemplateArgs = await retrieveContext(this);
        return mementoPromptTemplate(context);
    }

    /// This is the main entry point for the agent. It is called by the CLI to send a message to the agent.
    async run({ content }: SendArgs) : Promise<AssistantMessage> {
        // We save the message exchange to the database here
        // We do NOT call into this funciton recursively due to function calling.
        // When there is function calling, there may be multiple requests sent to chat providers
        // but only the first user message and the last assistant message will be stored in the database.

        // Any async actions should be handled here.
        const asyncResult = await awaitAsyncAgentActions({ asyncActionsPromise: this.asyncResponsePromise});

        let priorMessages: Message[] = await this.DB.getConversation(this.max_message_pairs);
        let userMessage: UserMessage = constructUserMessage(content);

        let assistantMessage: AssistantMessage = await this.functionHandler.handle(userMessage, priorMessages);

        let xchgId: ID;
        try {
            xchgId = await this.DB.addConvExchangeMementos({ userContent: userMessage.content, asstContent: assistantMessage.content });
        }
        catch (e) {
            console.error("Failed to store a Message to the db:", e);
            throw e;
        }

        const startAsyncAgentActionsArgs = {
            resolutionAgent: this.resolutionAgent,
            synopsisAgent: this.synopsisAgent,
            xchgId,
            db: this.DB,
            max_message_pairs: this.max_message_pairs
        };
        this.asyncResponsePromise = startAsyncAgentActions(startAsyncAgentActionsArgs);

        return assistantMessage;
    }
}
