// Path: packages/ingester/src/summarizeDocument.ts

import { Agent, type AgentArgs } from "@memento-ai/agent";
import { count_tokens } from "@memento-ai/encoding";
import { createConversation, type ConversationInterface, type SendMessageArgs, type Provider } from "@memento-ai/conversation";
import { MementoDb, type DocAndSummaryResult } from "@memento-ai/memento-db";
import { Message, USER } from "@memento-ai/types";

import debug from "debug";

const dlog = debug("summarizeDocument");

export interface SummarizerArgs {
    content: string;
    source: string;
}

export interface Summarizer {
    summarize: (args: SummarizerArgs) => Promise<string>;
}

export abstract class SummarizerAgent extends Agent implements Summarizer {
    constructor({ conversation }: AgentArgs) {
        const prompt = SummarizerAgent.makePrompt();
        super({ conversation, prompt });
    }

    async sendMessage({ messages }: SendMessageArgs) : Promise<Message> {
        return messages[0];
    }

    abstract summarize({ content, source }: SummarizerArgs) : Promise<string>;

    static makePrompt() : string {
        const system: string[] = [
            "Your task is to generate a summary of the given document.",
            "The document's entire content is provided in the user message. Your reponse should be a summary of the document.",
            "The document and the summary will be stored in a PostgreSQL database for Retrieval Augmented Generation.",
            "Each document will be indexed for both full text search (tsvector) and semantic similarity (pgvector).",
            "Your goal is to generate a summary that captures the essence of the document in a concise manner,",
            "such that the document and the summary will have similar tsvector and pgvector representations.",
            "This is the only purpose of the summary - to serve as a surrogate for the full document during retrieval.",
            "Note carefully:",
            "1. The summary will NOT be presented to human users.",
            "2. Do NOT include any helpful preamble or commentary.",
            "2a. Specifically, do NOT start the summary with `Here is a summary of the document:` or similar.",
            "3. Do NOT include any information that is not obtained from the document",
            "4. Be concise and factual."
        ]
        return system.join("\n");
    }
}

export class MockSummarizer extends SummarizerAgent {

    constructor(conversation: ConversationInterface) {
        super({ conversation });
    }

    async summarize({ content, source }: SummarizerArgs) : Promise<string> {
        dlog("Mock summarizer called with source:", source.slice(0, 32) + "...");
        return `Source path: ${source}\n${content.slice(0, 50)}\n... truncated here ...\n`;
    }

    async sendMessage(_: SendMessageArgs) : Promise<Message> {
        // Not used in this mock implementation
        throw new Error("MockSummarizer.sendMessage should never be called.");
    }
}

export function createMockSummarizer(): SummarizerAgent {
    return new MockSummarizer(createConversation('mock', { model: 'mock' }));
}

export class ChatSummarizerAgent extends SummarizerAgent {
    constructor(conversation: ConversationInterface) {
        super({ conversation });
    }

    async summarize({ content, source }: SummarizerArgs) : Promise<string> {
        const num_tokens = count_tokens(content);
        console.log(`Summarizing ${source} with ${num_tokens} tokens.`)
        const prompt = this.prompt as string
        const sendMessageArgs: SendMessageArgs = { prompt, messages: [{role: USER, content}] };
        const message = await this.conversation.sendMessage(sendMessageArgs);
        return message.content;
    }
}

export function createChatSummarizer(conversation: ConversationInterface): Summarizer {
    return new ChatSummarizerAgent(conversation);
}

export interface ProviderAndModel {
  provider: Provider;
  model: string;
}

const defaultProviderAndModel: ProviderAndModel = {
    provider: 'anthropic',
    model: 'haiku'
}

export class ModelSummarizerAgent extends ChatSummarizerAgent {
    constructor({ provider, model }: ProviderAndModel) {
        const conversation: ConversationInterface = createConversation(provider, { model, temperature: 0.0, max_response_tokens: 768 });
        super(conversation);
    }
}

export function createModelSummarizer(args: ProviderAndModel = defaultProviderAndModel): Summarizer {
    return new ModelSummarizerAgent(args);
}

export interface SummarizeAndStoreDocumentsArgs {
    db: MementoDb;
    source: string;
    content: string;
    summarizer: Summarizer;
}

export async function summarizeAndStoreDocuments(args: SummarizeAndStoreDocumentsArgs): Promise<DocAndSummaryResult> {
    const { db, source, content, summarizer } = args;
    const summary = await summarizer.summarize({content, source});
    if (!summary) {
        console.error("Error summarizing document");
        throw new Error("Error summarizing document");
    }
    dlog("Summary:", summary.slice(0, 32) + "...");
    const result: DocAndSummaryResult = await db.addDocAndSummary({content, source, summary});
    dlog("Document and summary stored:", result);
    return result;
}
