import { createChatSession, chat, type ChatSession } from "@memento-ai/chat";
import { MementoDb, type DocAndSummaryResult } from "@memento-ai/memento-db";
import { USER } from "@memento-ai/types";

import debug from "debug";

const dlog = debug("summarizeDocument");

export interface SummarizerArgs {
    content: string;
    source: string;
}

export interface Summarizer {
    ( args: SummarizerArgs ): Promise<string>;
}

export function createChatSummarizer(session: ChatSession): Summarizer {
    const system: string[] = [
        "Your task is to generate a summary of the given document.",
        "The document's entire content is provided in user message, your reponse should be a summary of the document.",
        "The document and the summary will be stored in a PostgreSQL data base for Retrieval Augmented Generation.",
        "Each document will be indexed for both full text search (tsvector) and semantic similarity (pgvector).",
        "Your goal is to generate a summary that captures the essence of the document in a concise manner,",
        "such that the document and the summary will have similar tsvector and pgvector representations.",
        "This is the only purpose of the summary - to serve as a surrogate for the full document during retrieval.",
        "Note carefully:",
        "1. The summary will NOT be presented to human users",
        "2. Do NOT include any helpful preamble or commentary.",
        "2a. Specifically, do NOT start the summary with `Here is a summary of the document:`",
        "3. Do NOT include any information that is not in the document",
        "4. Be concise and factual."
    ]

    return async (args: SummarizerArgs) => {
        const { source, content } = args;
        console.log(`Summarizing ${source}`)
        const message = await chat(session, [{ role: USER, content }], system);
        return message.content;
    }
}

export function createModelSummarizer(model: string = "haiku"): Summarizer {
    const session = createChatSession({ temperature: 0.0, model});
    return createChatSummarizer(session);
}

export function createMockSummarizer(): Summarizer {
    return async (args: SummarizerArgs) => {
        const { source, content } = args;
        dlog("Mock summarizer called with source:", source.slice(0, 32) + "...");
        return `Source path: ${source}\n${content.slice(0, 50)}\n... truncated here ...\n`;
    }
}

export interface SummarizeAndStoreDocumentsArgs {
    db: MementoDb;
    source: string;
    content: string;
    summarizer: Summarizer;
}

export async function summarizeAndStoreDocuments(args: SummarizeAndStoreDocumentsArgs): Promise<DocAndSummaryResult> {
    const { db, source, content, summarizer } = args;
    const summary = await summarizer({content, source});
    if (!summary) {
        console.error("Error summarizing document");
        throw new Error("Error summarizing document");
    }
    dlog("Summary:", summary.slice(0, 32) + "...");
    const result: DocAndSummaryResult = await db.addDocAndSummary({content, source, summary});
    dlog("Document and summary stored:", result);
    return result;
}
