// Path: packages/memento-db/src/tests/checkCsumSimilarity.test.ts

import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import { expect, it, describe, beforeEach, afterEach} from "bun:test";
import { nanoid } from "nanoid";
import { MementoDb } from "../mementoDb";
import { checkCsumSimilarity } from "../checkCsumSimilarity";

describe("get last user or assistant message", () => {

    let dbname: string;
    let db: MementoDb;
    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        db = await MementoDb.create(dbname);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();

        await db.addConvSummaryMem({ metaId: 'message-1', content: "message1", pinned: true, priority: 1 });
        await db.addConvSummaryMem({ metaId: 'message-2', content: "Why is the sky blue?", pinned: true, priority: 1 });
        await db.addConvSummaryMem({ metaId: 'message-3', content: "Why is the sky blue-green?", pinned: true, priority: 1 });
        await db.addConvSummaryMem({ metaId: 'message-4', content: "Tell me a joke", pinned: true, priority: 1 });
        await db.addConvSummaryMem({ metaId: 'message-5', content: "How many fingers on one hand", pinned: true, priority: 1 });
    });

    afterEach(async () => {
        expect(db).toBeTruthy();
        await db.close();
        await dropDatabase(dbname);
    });

    it("Exact match", async () => {
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();

        const similarities = await checkCsumSimilarity(db.pool, "Why is the sky blue?");
        expect(similarities).toBeTruthy();
        expect(similarities.length).toBe(1);
        expect(similarities[0].id).toBe("message-2");
        expect(similarities[0].distance).toBe(0.0);
    });

    it("Close match", async () => {
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();

        const similarities = await checkCsumSimilarity(db.pool, "message1 foo");
        expect(similarities).toBeTruthy();
        expect(similarities.length).toBe(1);
        expect(similarities[0].id).toBe("message-1");
    });

});
