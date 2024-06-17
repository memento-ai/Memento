// Path: packages/memento-agent/src/mementoAgent.ts

import { awaitAsyncAgentActions, startAsyncAgentActions } from "./asyncAgentGlue";
import { constructUserMessage } from "@memento-ai/types";
import { FunctionCallingAgent } from "@memento-ai/function-calling";
import { FunctionHandler, registry, type FunctionCallResult } from "@memento-ai/function-calling";
import { getDatabaseSchema } from "@memento-ai/postgres-db";
import { mementoPromptTemplate } from "./mementoPromptTemplate";
import { retrieveContext } from "./retrieveContext";
import { selectSimilarMementos, combineSearchResults, trimSearchResult } from "@memento-ai/search";
import { Writable } from "node:stream";
import type { AgentArgs, SendArgs } from "@memento-ai/agent";
import type { ID } from "@memento-ai/postgres-db";
import type { MementoPromptTemplateArgs } from "./mementoPromptTemplate";
import type { MementoSearchResult } from "@memento-ai/search";
import type { Message, UserMessage, AssistantMessage } from "@memento-ai/types";
import type { ResolutionAgent } from "@memento-ai/resolution-agent";
import { createSynopsisAgent, type SynopsisAgent } from "@memento-ai/synopsis-agent";
import type { Config } from "@memento-ai/config";
import { createMementoDbFromConfig, type MementoDb } from "@memento-ai/memento-db";
import { createConversationFromConfig } from "@memento-ai/conversation";
import { createResolutionAgent } from "@memento-ai/resolution-agent";

export type MementoAgentArgs = AgentArgs & {
    config: Config;
    db: MementoDb;
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

    config: Config;

    asyncResults: Promise<FunctionCallResult[]>;
    functionHandler: FunctionHandler;
    asyncResponsePromise: Promise<string>;
    aggregateSearchResults: MementoSearchResult[];

    constructor(args: MementoAgentArgs)
    {
        const { conversation, db, outStream, resolutionAgent, synopsisAgent, config } = args;
        super({ db, conversation, registry });
        this.databaseSchema = getDatabaseSchema();
        this.outStream = outStream;
        this.resolutionAgent = resolutionAgent;
        this.synopsisAgent = synopsisAgent;
        this.config = config;
        this.asyncResults = Promise.resolve([]);
        this.functionHandler = new FunctionHandler({ agent: this });
        this.asyncResponsePromise = Promise.resolve("");
        this.aggregateSearchResults = [];
    }

    close(): Promise<void> {
        return this.db.close();
    }

    // Create the prompt, overriden from the Agent base class
    async generatePrompt(): Promise<string> {
        const args = {
            maxTokens: this.config.search.max_tokens,
            numKeywords: this.config.search.keywords,
            content: this.lastUserMessage.content,
        };
        const currentSearchResults = await selectSimilarMementos(this.db.pool, args);
        const {maxTokens} = args;
        const p = this.config.search.decay.user;
        let results = combineSearchResults({ lhs: currentSearchResults, rhs: this.aggregateSearchResults, maxTokens, p });

        // Trim the search results to the max number of tokens.
        // We could possibly retain the untrimmed result in this.aggregateSearchResults even,
        // but that could lead to very large accumulations of search results.
        results = trimSearchResult(results, maxTokens);
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
        await awaitAsyncAgentActions({ asyncActionsPromise: this.asyncResponsePromise});

        const priorMessages: Message[] = await this.db.getConversation(this.config);
        const userMessage: UserMessage = constructUserMessage(content);

        const assistantMessage: AssistantMessage = await this.functionHandler.handle(userMessage, priorMessages);

        // Also use the assistant's response to update the search context.
        // This will only be used for the next user message.
        const args = {
            maxTokens: this.config.search.max_tokens,
            numKeywords: this.config.search.keywords,
            content: assistantMessage.content,
        };
        const currentSearchResults = await selectSimilarMementos(this.db.pool, args);
        const {maxTokens} = args;
        const p = this.config.search.decay.asst;
        const results = combineSearchResults({ lhs: this.aggregateSearchResults, rhs: currentSearchResults, maxTokens, p });
        this.aggregateSearchResults = results;

        let xchgId: ID;
        try {
            xchgId = await this.db.addConvExchangeMementos({ userContent: userMessage.content, asstContent: assistantMessage.content });
        }
        catch (e) {
            console.error("Failed to store a Message to the db:", e);
            throw e;
        }

        const startAsyncAgentActionsArgs = {
            resolutionAgent: this.resolutionAgent,
            synopsisAgent: this.synopsisAgent,
            xchgId,
            db: this.db,
            max_message_pairs: this.config.conversation.max_exchanges,
        };
        this.asyncResponsePromise = startAsyncAgentActions(startAsyncAgentActionsArgs);

        return assistantMessage;
    }
}

export type MementoAgentExtraArgs =  {
    synopsisAgent?: SynopsisAgent;
    resolutionAgent?: ResolutionAgent;
    outStream?: Writable;
}

export async function createMementoAgent(config: Config, db: MementoDb, extra : MementoAgentExtraArgs): Promise<MementoAgent> {
    const { synopsisAgent, resolutionAgent, outStream } = extra;
    const conversation = createConversationFromConfig(config.memento_agent, outStream);
    if (conversation == undefined) {
        throw new Error('MementoAgent requires a conversation provider.');
    }
    const agentArgs: MementoAgentArgs = {
        db,
        conversation,
        synopsisAgent,
        resolutionAgent,
        outStream,
        config
    };
    return new MementoAgent(agentArgs);
}

export type MementoSystem = {
    db: MementoDb;
    mementoAgent: MementoAgent;
    synopsisAgent?: SynopsisAgent;
    resolutionAgent?: ResolutionAgent;
}

export async function createMementoSystem(config: Config, outStream?: Writable): Promise<MementoSystem> {
    const db = await createMementoDbFromConfig(config);
    const synopsisAgent = await createSynopsisAgent(config, db);
    const resolutionAgent = await createResolutionAgent(config, db);
    const mementoAgent = await createMementoAgent(config, db, {synopsisAgent, resolutionAgent, outStream});
    return { db, mementoAgent, synopsisAgent, resolutionAgent };
}
