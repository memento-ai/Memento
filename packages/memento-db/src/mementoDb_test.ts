import { expect, it, describe, beforeAll, afterAll, beforeEach, afterEach} from "bun:test";
import { MementoDb, SimilarityResult } from "./mementoDb";

import { chat, createChatSession } from "@memento-ai/chat";
import { USER, type Message, ASSISTANT } from "@memento-ai/types";
import { nanoid } from "nanoid";
import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import { ingestDirectory, ingestFile } from "@memento-ai/ingester";
import { getProjectRoot } from "@memento-ai/utils";

import debug from "debug";

const dlog = debug("mementoDb");

describe("MementoDb", () => {

    let db: MementoDb;
    let dbname: string;
    beforeAll(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        db = await MementoDb.create(dbname);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
    });

    afterAll(async () => {
        await db.close();
        await dropDatabase(dbname);
    });

    it("can add a conversation mem", async () => {
        const id = await db.addConversationMem({content: "test conversation mem", role: USER});
        expect(id).toBeTruthy();
    });

    it("can add a system mem", async () => {
        const id = await db.addSystemMem({content: "test system mem", priority: 1 });
        expect(id).toBeTruthy();
    });

    it("can add a fragment mem", async () => {
        const id = await db.addFragmentMem({content: "test fragment mem", docId: "testDoc"});
        expect(id).toBeTruthy();
    });

    it("can add a doc and summary mem pair", async () => {
        const result = await db.addDocAndSummary({content: "test document mem", summary: "test document summary mem", source: "testSource"});
        expect(result).toBeTruthy();
    });

    it("can add a conversation summary mem", async () => {
        const id = await db.addConvSummaryMem({content: "test conversation summary"});
        expect(id).toBeTruthy();
    });
});

describe("MementoCollection independent db required", () => {

    const timeout = 10000;

    let dbname: string;
    let db: MementoDb;
    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        db = await MementoDb.create(dbname);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
    });

    afterEach(async () => {
        expect(db).toBeTruthy();
        await db.close();
        await dropDatabase(dbname);
    });

    it('can exercise beforeEach and afterEach', () => {
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
    }, timeout);

    it("can add several conversations and retrieve them", async () => {
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
        await db.addConversationMem({content: "testMem1", role: USER});
        await db.addConversationMem({content: "testMem2", role: ASSISTANT});
        await db.addConversationMem({content: "testMem3", role: USER});
        const conversation: Message[] = await db.getConversation();
        expect(conversation.length).toBe(3);
    }, timeout);

    it("can load the system prompt and ask a question", async () => {
        const session = createChatSession();

        const prompts = await db.getSystemPrompts();
        expect(prompts).toBeTruthy();
        expect(prompts.length).toBe(prompts.length);
        expect(prompts[0]).toBeTruthy();

        const messages: Message[] = [{ role: USER, content: 'What did Shelby suffer from?' }];

        const message: Message = await chat(session, messages, prompts);
        expect(message).toBeTruthy();
        expect(message.content).toBeTruthy();
        expect(message.role).toEqual(ASSISTANT);
        expect(message.content).toInclude("Leonard");
        dlog(message);
    }, timeout);

    it("can ingest one file and retrieve it with semantic similarity", async () => {
        const projectRoot = getProjectRoot();
        const mementoSchemaPath  = `${projectRoot}/packages/types/src/mementoSchema.ts`;
        const ingestFileResult = await ingestFile(db, mementoSchemaPath);
        dlog("Ingested file", ingestFileResult)
        const result: SimilarityResult[] = await db.searchMemsBySimilarity(`There are six kinds of MemMetaData:
            ConversationMetaData,
            ConvSummaryMetaData,
            DocSummaryMetaData,
            DocumentMetaData,
            FragmentMetaData,
            SystemMetaData,
        `, 3);
        dlog("searchMemsBySimilarity:", result);
        expect(result.length).toBeGreaterThan(0);
        dlog(result.map(({source, similarity}) => ({ source, similarity })));
        expect(result[0].source).toBe(mementoSchemaPath);
    }, timeout);

    it("can ingest multiple files and retrieve them with semantic similarity", async () => {
        const projectRoot = getProjectRoot();
        const mementoSchemaPath  = `${projectRoot}/packages/types/src/mementoSchema.ts`;
        await ingestFile(db, mementoSchemaPath);
        await ingestDirectory(db, `${projectRoot}/packages/function-calling/src`);
        const result = await db.searchMemsBySimilarity(`There are six kinds of MemMetaData:
            ConversationMetaData,
            ConvSummaryMetaData,
            DocSummaryMetaData,
            DocumentMetaData,
            FragmentMetaData,
            SystemMetaData,
        `, 3);
        dlog(result);
        dlog(result.map(({source, similarity}) => ({ source, similarity })));
        expect(result[0].source).toBe(mementoSchemaPath);
    }, timeout);
});
