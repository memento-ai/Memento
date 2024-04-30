// Path: packages/memento-db/src/tests/mementoDb-addMems.test.ts
import { expect, it, describe, beforeAll, afterAll} from "bun:test";
import { MementoDb } from '../mementoDb';

import { USER } from "@memento-ai/types";
import { nanoid } from "nanoid";
import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";

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

    it("can add a fragment mem", async () => {
        const id = await db.addFragmentMem({content: "test fragment mem", docId: "testDoc"});
        expect(id).toBeTruthy();
    });

    it("can add a doc and summary mem pair", async () => {
        const result = await db.addDocAndSummary({content: "test document mem", summary: "test document summary mem", source: "testSource"});
        expect(result).toBeTruthy();
    });

    it("can add a conversation summary mem", async () => {
        const id = await db.addConvSummaryMem({content: "test conversation summary", metaId: "test/summary", pinned: true, priority: 1});
        expect(id).toBeTruthy();
    });
});
