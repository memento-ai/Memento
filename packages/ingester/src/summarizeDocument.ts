// Path: packages/ingester/src/summarizeDocument.ts

import { Agent, type AgentArgs } from '@memento-ai/agent'
import { createConversation, type ConversationInterface, type Provider } from '@memento-ai/conversation'
import { count_tokens } from '@memento-ai/encoding'
import { MementoDb, type DocAndSummaryResult } from '@memento-ai/memento-db'
import { ASSISTANT, AssistantMessage } from '@memento-ai/types'

import { stripCommonIndent } from '@memento-ai/utils'
import debug from 'debug'

const dlog = debug('summarizeDocument')

export interface SummarizerArgs {
    content: string
    source: string
}

export interface Summarizer {
    summarize: (args: SummarizerArgs) => Promise<AssistantMessage>
}

export abstract class SummarizerAgent extends Agent implements Summarizer {
    constructor({ conversation }: AgentArgs) {
        super({ conversation })
    }

    abstract summarize({ content, source }: SummarizerArgs): Promise<AssistantMessage>

    async generatePrompt(): Promise<string> {
        const system: string = stripCommonIndent(`
            # Instructions
            Your task is to generate a response that is a *concise* summary of the given document.
            The document's entire content is provided in the user message.
            Your *entire* reponse will be stored in a database as the summary of the document.
            Your response should therefore not contain any text that is not part of the intended summary.
            Be concise and factual.
        `)
        return system
    }
}

export class MockSummarizer extends SummarizerAgent {
    constructor(conversation: ConversationInterface) {
        super({ conversation })
    }

    async summarize({ content, source }: SummarizerArgs): Promise<AssistantMessage> {
        dlog('Mock summarizer called with source:', source.slice(0, 32) + '...')
        const response = `Source path: ${source}\n${content.slice(0, 50)}\n... truncated here ...\n`
        return { role: ASSISTANT, content: response }
    }
}

export function createMockSummarizer(): SummarizerAgent {
    return new MockSummarizer(createConversation('mock', { model: 'mock', logging: { name: 'MockSummarizer' } }))
}

export class ChatSummarizerAgent extends SummarizerAgent {
    constructor(conversation: ConversationInterface) {
        super({ conversation })
    }

    async summarize({ content, source }: SummarizerArgs): Promise<AssistantMessage> {
        const num_tokens = count_tokens(content)
        dlog(`Summarizing ${source} with ${num_tokens} tokens.`)
        return this.send({ content })
    }
}

export function createChatSummarizer(conversation: ConversationInterface): Summarizer {
    return new ChatSummarizerAgent(conversation)
}

export interface ProviderAndModel {
    provider: Provider
    model: string
}

const defaultProviderAndModel: ProviderAndModel = {
    provider: 'anthropic',
    model: 'haiku',
}

export class ModelSummarizerAgent extends ChatSummarizerAgent {
    constructor({ provider, model }: ProviderAndModel) {
        const conversation: ConversationInterface = createConversation(provider, {
            model,
            temperature: 0.0,
            max_response_tokens: 768,
            logging: { name: 'ModelSummarizer' },
        })
        super(conversation)
    }
}

export function createModelSummarizer(args: ProviderAndModel = defaultProviderAndModel): Summarizer {
    return new ModelSummarizerAgent(args)
}

export interface SummarizeAndStoreDocumentsArgs {
    db: MementoDb
    source: string
    content: string
    summarizer: Summarizer
}

export async function summarizeAndStoreDocuments(args: SummarizeAndStoreDocumentsArgs): Promise<DocAndSummaryResult> {
    const { db, source, content, summarizer } = args
    let summary = (await summarizer.summarize({ content, source })).content
    if (!summary) {
        console.error('Error summarizing document')
        throw new Error('Error summarizing document')
    }

    const lines = summary.split('\n')
    if (lines[0].startsWith('Here is a')) {
        lines.shift()
        if (lines[0].trim() === '') {
            lines.shift()
        }
    }
    summary = lines.join('\n')

    dlog('Summary:', summary.slice(0, 200) + '...')
    const result: DocAndSummaryResult = await db.addDocAndSummary({ content, source, summary })
    dlog('Document and summary stored:', result)
    return result
}
