// Path: packages/memento-db/src/tests/mementoDb.test.ts

import { expect, it, describe, beforeEach, afterEach} from "bun:test";
import { SimilarityResult } from "../mementoDb-types";
import { MementoDb } from '../mementoDb';

import { USER, type Message, ASSISTANT } from "@memento-ai/types";
import { nanoid } from "nanoid";
import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import { ingestDirectory, ingestFile } from "@memento-ai/ingester";
import { getProjectRoot } from "@memento-ai/utils";

import debug from "debug";

const dlog = debug("mementoDb:test");

describe("MementoCollection independent db required", () => {

    const timeout = 30000;
    const tokensLimit = 2000;

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

    it("can ingest one file and retrieve it with semantic similarity", async () => {
        const projectRoot = getProjectRoot();
        const mementoSchemaPath  = `${projectRoot}/packages/types/src/mementoSchema.ts`;
        const ingestFileResult = await ingestFile(db, mementoSchemaPath);
        dlog("Ingested file", ingestFileResult)
        const result: SimilarityResult[] = await db.searchMemsBySimilarity(`
There are six kinds of MemMetaData:
    ConversationMetaData,
    ConvSummaryMetaData,
    DocSummaryMetaData,
    DocumentMetaData,
    FragmentMetaData,
    SystemMetaData,
        `, tokensLimit);
        dlog("searchMemsBySimilarity:", result);
        expect(result.length).toBeGreaterThan(0);
        dlog(result.map(({source, similarity}) => ({ source, similarity })));
        expect(result[0].source).toBe(mementoSchemaPath);
    }, timeout);

    it("can ingest multiple files and retrieve them with semantic similarity", async () => {
        const projectRoot = getProjectRoot();
        const encodingPath  = `${projectRoot}/packages/encoding/src/encoding.ts`;
        await ingestFile(db, encodingPath);
        await ingestDirectory({db, dirPath: `${projectRoot}/packages/function-calling/src`});
        const result = await db.searchMemsBySimilarity(`
export function decode_to_string(encoded: Uint32Array): string {
    return new TextDecoder().decode(enc.decode(encoded));
}

export function count_tokens(text: string): number {
    return enc.encode(text).length;
}
`, tokensLimit);
        dlog(result);
        dlog(result.map(({source, similarity}) => ({ source, similarity })));
        expect(result[0].source).toBe(encodingPath);
    }, timeout);
});
