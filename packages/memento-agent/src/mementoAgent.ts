// Path: packages/memento-agent/src/mementoAgent.ts

import type { AgentArgs, SendArgs } from '@memento-ai/agent'
import type { Config } from '@memento-ai/config'
import { FunctionCallingAgent, FunctionHandler, type FunctionCallResult } from '@memento-ai/function-calling'
import { registry } from '@memento-ai/function-registry'
import { type MementoDb } from '@memento-ai/memento-db'
import type { ID } from '@memento-ai/postgres-db'
import { getDatabaseSchema } from '@memento-ai/postgres-db'
import type { ResolutionAgent } from '@memento-ai/resolution-agent'
import type { MementoSearchResult } from '@memento-ai/search'
import { combineSearchResults, selectSimilarMementos, trimSearchResult } from '@memento-ai/search'
import { type SynopsisAgent } from '@memento-ai/synopsis-agent'
import type { AssistantMessage, Message, UserMessage } from '@memento-ai/types'
import { constructUserMessage } from '@memento-ai/types'
import { Writable } from 'node:stream'
import { awaitAsyncAgentActions, startAsyncAgentActions } from './asyncAgentGlue'
import type { MementoPromptTemplateArgs } from './mementoPromptTemplate'
import { mementoPromptTemplate } from './mementoPromptTemplate'
import { retrieveContext } from './retrieveContext'

export type MementoAgentArgs = AgentArgs & {
    config: Config
    db: MementoDb
    outStream?: Writable
    resolutionAgent?: ResolutionAgent
    synopsisAgent?: SynopsisAgent
}

export class MementoAgent extends FunctionCallingAgent {
    databaseSchema: string
    outStream?: Writable
    resolutionAgent?: ResolutionAgent
    synopsisAgent?: SynopsisAgent
    config: Config
    asyncResults: Promise<FunctionCallResult[]>
    functionHandler: FunctionHandler
    asyncResponsePromise: Promise<string>
    aggregateSearchResults: MementoSearchResult[]

    constructor(args: MementoAgentArgs) {
        const { conversation, db, outStream, resolutionAgent, synopsisAgent, config } = args
        super({ db, conversation, registry })
        this.databaseSchema = getDatabaseSchema()
        this.outStream = outStream
        this.resolutionAgent = resolutionAgent
        this.synopsisAgent = synopsisAgent
        this.config = config
        this.asyncResults = Promise.resolve([])
        this.functionHandler = new FunctionHandler({ agent: this })
        this.asyncResponsePromise = Promise.resolve('')
        this.aggregateSearchResults = []
    }

    close(): Promise<void> {
        return this.db.close()
    }

    // Create the prompt, overriden from the Agent base class
    async generatePrompt(): Promise<string> {
        const args = {
            maxTokens: this.config.search.max_tokens,
            numKeywords: this.config.search.keywords,
            content: this.lastUserMessage.content,
        }
        const currentSearchResults = await selectSimilarMementos(this.db.pool, args)
        const { maxTokens } = args
        const p = this.config.search.decay.user
        let results = combineSearchResults({
            lhs: currentSearchResults,
            rhs: this.aggregateSearchResults,
            maxTokens,
            p,
        })

        // Trim the search results to the max number of tokens so that it doesn't grow unbounded.
        results = trimSearchResult(results, maxTokens)
        this.aggregateSearchResults = results

        const synMems: string[] = !this.synopsisAgent ? [] : await this.synopsisAgent.getSynopses()

        const context: MementoPromptTemplateArgs = await retrieveContext(this, results)
        return mementoPromptTemplate({ ...context, synMems })
    }

    /// This is the main entry point for the agent. It is called by the CLI to send a message to the agent.
    async run({ content, stream }: SendArgs): Promise<AssistantMessage> {
        await awaitAsyncAgentActions({ asyncActionsPromise: this.asyncResponsePromise })

        const priorMessages: Message[] = await this.db.getConversation(this.config)
        const userMessage: UserMessage = constructUserMessage(content)

        const assistantMessage: AssistantMessage = await this.functionHandler.handle({
            userMessage,
            priorMessages,
            stream,
        })

        // Use the assistant's response to update the search context for the next user message.
        const args = {
            maxTokens: this.config.search.max_tokens,
            numKeywords: this.config.search.keywords,
            content: assistantMessage.content,
        }
        const currentSearchResults = await selectSimilarMementos(this.db.pool, args)
        const p = this.config.search.decay.asst
        this.aggregateSearchResults = combineSearchResults({
            lhs: this.aggregateSearchResults,
            rhs: currentSearchResults,
            maxTokens: args.maxTokens,
            p,
        })

        const xchgId: ID = await this.db.addConvExchangeMementos({
            userContent: userMessage.content,
            asstContent: assistantMessage.content,
        })

        this.asyncResponsePromise = startAsyncAgentActions({
            resolutionAgent: this.resolutionAgent,
            synopsisAgent: this.synopsisAgent,
            xchgId,
            db: this.db,
        })

        return assistantMessage
    }
}
