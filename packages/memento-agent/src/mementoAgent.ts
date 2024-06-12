// Path: packages/memento-agent/src/mementoAgent.ts

import { awaitAsyncAgentActions, startAsyncAgentActions } from "./asyncAgentGlue";
import { constructUserMessage } from "@memento-ai/types";
import { FunctionCallingAgent } from "@memento-ai/agent";
import { FunctionHandler, registry, type FunctionCallResult } from "@memento-ai/function-calling";
import { getDatabaseSchema } from "@memento-ai/postgres-db";
import { mementoPromptTemplate } from "./mementoPromptTemplate";
import { retrieveContext } from "./retrieveContext";
import { selectSimilarMementos, combineMementoResults } from "@memento-ai/search";
import { Writable } from "node:stream";
import type { AgentArgs, SendArgs } from "@memento-ai/agent";
import type { ID } from "@memento-ai/postgres-db";
import type { MementoPromptTemplateArgs } from "./mementoPromptTemplate";
import type { MementoSearchResult } from "@memento-ai/search";
import type { Message, UserMessage, AssistantMessage } from "@memento-ai/types";
import type { ResolutionAgent } from "@memento-ai/resolution-agent";
import type { SynopsisAgent } from "@memento-ai/synopsis-agent";
import type { Config } from "@memento-ai/config";

export type MementoAgentArgs = AgentArgs & {
    config: Config;
    outStream?: Writable;
    resolutionAgent?: ResolutionAgent;
    synopsisAgent?: SynopsisAgent;
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
    max_response_tokens: number;
    max_similarity_tokens: number;
    max_synopses_tokens: number;
    num_keywords: number;

    asyncResults: Promise<FunctionCallResult[]>;
    functionHandler: FunctionHandler;
    asyncResponsePromise: Promise<string>;
    aggregateSearchResults: MementoSearchResult[];

    constructor(args: MementoAgentArgs)
    {
        const { conversation, db, outStream, resolutionAgent, synopsisAgent, config } = args;
        super({ conversation, db, registry });
        this.databaseSchema = getDatabaseSchema();
        this.outStream = outStream;
        this.resolutionAgent = resolutionAgent;
        this.synopsisAgent = synopsisAgent;
        this.max_message_pairs = config.conversation.max_exchanges;
        this.max_response_tokens = config.conversation.max_tokens;
        this.max_similarity_tokens = config.search.max_tokens ;
        this.max_synopses_tokens = config.synopsis_agent.max_tokens;
        this.num_keywords = config.search.keywords;
        this.asyncResults = Promise.resolve([]);
        this.functionHandler = new FunctionHandler({ agent: this });
        this.asyncResponsePromise = Promise.resolve("");
        this.aggregateSearchResults = [];
    }

    close(): Promise<void> {
        return this.DB.close();
    }

    // Create the prompt, overriden from the Agent base class
    async generatePrompt(): Promise<string> {
        const args = {
            maxTokens: this.max_similarity_tokens,
            numKeywords: 5,
            content: this.lastUserMessage.content,
        };
        const currentSearchResults = await selectSimilarMementos(this.DB.pool, args);
        const {maxTokens} = args;
        const results = combineMementoResults({ lhs: this.aggregateSearchResults, rhs: currentSearchResults, maxTokens, p: 0.5});
        this.aggregateSearchResults = results;

        const context: MementoPromptTemplateArgs = await retrieveContext(this, results);
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

        // Also use the assistant's response to update the search context.
        // This will only be used for the next user message.
        const args = {
            maxTokens: 16000,
            numKeywords: 5,
            content: assistantMessage.content,
        };
        const currentSearchResults = await selectSimilarMementos(this.DB.pool, args);
        const {maxTokens} = args;
        const results = combineMementoResults({ lhs: this.aggregateSearchResults, rhs: currentSearchResults, maxTokens, p: 0.5});
        this.aggregateSearchResults = results;

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
