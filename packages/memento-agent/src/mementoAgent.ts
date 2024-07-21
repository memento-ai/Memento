// Path: packages/memento-agent/src/mementoAgent.ts

import type { AgentArgs, SendArgs } from '@memento-ai/agent'
import type { Config } from '@memento-ai/config'
import type { FunctionCallResult, SendUserMessageAndExecuteFunctionsResult } from '@memento-ai/function-calling'
import { FunctionCallingAgent, FunctionHandler } from '@memento-ai/function-calling'
import { registry } from '@memento-ai/function-registry'
import { type MementoDb } from '@memento-ai/memento-db'
import type { GetConversationSnapshotResult, ID } from '@memento-ai/postgres-db'
import { getDatabaseSchema } from '@memento-ai/postgres-db'
import type { ResolutionAgent } from '@memento-ai/resolution-agent'
import type { MementoSearchResult } from '@memento-ai/search'
import { MementoSearchArgs, combineSearchResults, selectSimilarMementos, trimSearchResult } from '@memento-ai/search'
import { type SynopsisAgent } from '@memento-ai/synopsis-agent'
import type { AssistantMessage, Message, MetaId, UserMessage } from '@memento-ai/types'
import { constructAssistantMessage, constructUserMessage } from '@memento-ai/types'
import { zodParse } from '@memento-ai/utils'
import debug from 'debug'
import { Writable } from 'node:stream'
import { awaitAsyncAgentActions, startAsyncAgentActions } from './asyncAgentGlue'
import type { MementoPromptTemplateArgs } from './mementoPromptTemplate'
import { emptyPromptTemplateArgs, mementoPromptTemplate } from './mementoPromptTemplate'
import { retrieveContext } from './retrieveContext'

const dlog = debug('mementoAgent')

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
    priorMessages: Message[]
    xchg_ids: MetaId[]
    promptContext: MementoPromptTemplateArgs

    constructor(args: MementoAgentArgs) {
        const { conversation, db, outStream, resolutionAgent, synopsisAgent, config } = args
        super({ db, conversation, registry })
        this.databaseSchema = getDatabaseSchema()
        this.outStream = outStream
        this.resolutionAgent = resolutionAgent
        this.synopsisAgent = synopsisAgent
        this.config = config
        this.asyncResults = Promise.resolve([])
        this.functionHandler = new FunctionHandler({
            agent: this,
            max_func_cycles: config.memento_agent.max_func_cycles,
        })
        this.asyncResponsePromise = Promise.resolve('')
        this.aggregateSearchResults = []
        this.priorMessages = []
        this.xchg_ids = []
        this.promptContext = emptyPromptTemplateArgs

        dlog('MementoAgent created')
    }

    close(): Promise<void> {
        return this.db.close()
    }

    // Create the prompt, overriden from the Agent base class
    async generatePrompt(): Promise<string> {
        dlog('generatePrompt: start')
        const args = zodParse(MementoSearchArgs, {
            max_tokens: this.config.search_context.tokens,
            keywords: this.config.search_context.keywords,
            content: this.lastUserMessage.content,
        })
        dlog(
            `generatePrompt: max_tokens: ${args.max_tokens}, keywords: ${args.keywords}, content: ${args.content.slice(
                0,
                50,
            )}...`,
        )
        const currentSearchResults = await selectSimilarMementos(this.db.pool, args)
        const { max_tokens } = args
        const p = this.config.search_context.weight.user
        const results = combineSearchResults({
            lhs: currentSearchResults,
            rhs: this.aggregateSearchResults,
            max_tokens,
            p,
        })

        // Trim the search results to the max number of tokens so that it doesn't grow unbounded.
        const aggregateSearchResults = trimSearchResult(results, max_tokens)
        this.aggregateSearchResults = aggregateSearchResults

        const synMems: string[] = !this.synopsisAgent ? [] : await this.synopsisAgent.getSynopses()

        const context: MementoPromptTemplateArgs = await retrieveContext({
            agent: this,
            aggregateSearchResults,
            xchg_ids: this.xchg_ids,
        })
        this.promptContext = context
        const prompt = mementoPromptTemplate({ ...context, synMems })

        dlog(`generatePrompt: prompt: ${prompt.slice(0, 50)}...`)
        return prompt
    }

    responsePartsToMessage(responseParts: string[], funcMementoIds: MetaId[]): AssistantMessage {
        if (responseParts.length === 0) {
            throw new Error('No responseParts to convert to message')
        }
        if (funcMementoIds.length === 0 && responseParts.length === 1) {
            // This is the normal case when no functions were invoked
            return constructAssistantMessage(responseParts[0])
        } else if (funcMementoIds.length > 0 && responseParts.length > 1) {
            // This is the case where functions were invoked, so we need to synthesize the response
            const assistant_synthesized = responseParts
                .map((t) => `<partial_response>${t}</partial_response>`)
                .join('\n')
            const assistantMessage: AssistantMessage = constructAssistantMessage(
                `<synthesized_response>\n${assistant_synthesized}\n</synthesized_response>`,
            )
            dlog(`assistantMessage: ${assistantMessage.content}, funcMementoIds: ${funcMementoIds}`)
            return assistantMessage
        } else {
            throw new Error('Unexpected combination of responseParts and funcMementoIds')
        }
    }

    /// This is the main entry point for the agent. It is called by the CLI to send a message to the agent.
    async run({ content, stream }: SendArgs): Promise<AssistantMessage> {
        dlog(`run: content: ${content.slice(0, 50)}...`)
        await awaitAsyncAgentActions({ asyncActionsPromise: this.asyncResponsePromise })

        if (content.length === 0) {
            const error = new Error('Empty user content')
            Error.captureStackTrace(error)
            console.error(error)
            throw error
        }

        const userMessage: UserMessage = constructUserMessage(content)
        this.lastUserMessage = userMessage
        const conversationSnapshot: GetConversationSnapshotResult = await this.db.getConversation(this.config)
        this.priorMessages = conversationSnapshot.messages
        this.xchg_ids = conversationSnapshot.xchg_ids

        const functionHandlerResult: SendUserMessageAndExecuteFunctionsResult =
            await this.functionHandler.sendUserMessageAndExecuteFunctions({
                userMessage,
                priorMessages: this.priorMessages,
                stream,
            })

        const { responseParts, funcMementoIds } = functionHandlerResult

        if (responseParts.length === 0) {
            const error = new Error('Empty responseParts')
            Error.captureStackTrace(error)
            console.error(error, funcMementoIds)
            throw error
        }

        const assistantMessage: AssistantMessage = this.responsePartsToMessage(responseParts, funcMementoIds)

        // Use the assistant's response to update the search context for the next user message.
        const args = zodParse(MementoSearchArgs, {
            max_tokens: this.config.search_context.tokens,
            keywords: this.config.search_context.keywords,
            content: assistantMessage.content,
        })
        const currentSearchResults = await selectSimilarMementos(this.db.pool, args)
        const p = this.config.search_context.weight.asst
        this.aggregateSearchResults = combineSearchResults({
            lhs: this.aggregateSearchResults,
            rhs: currentSearchResults,
            max_tokens: args.max_tokens,
            p,
        })

        const xchgId: ID = await this.db.addConvExchangeFuncMementos({
            userContent: userMessage.content,
            asstContent: assistantMessage.content,
            funcMementoIds,
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
