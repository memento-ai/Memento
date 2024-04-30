// Path: packages/memento-db/src/tests/mementoDb-get_csum_mementos.test.ts
import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import { expect, it, describe, beforeEach, afterEach} from "bun:test";
import { nanoid } from "nanoid";
import { MementoDb } from "../mementoDb";
import type { ConvSummaryMetaData } from "@memento-ai/types";
import type { CommonQueryMethods } from "slonik";

describe("Get CSUM mementos", () => {

    let dbname: string;
    let db: MementoDb;
    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        db = await MementoDb.create(dbname);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();

        await db.addConvSummaryMem({content: "test conversation summary", metaId: "test/summary", pinned: true, priority: 1});
        await db.addConvSummaryMem({content: "bogus", metaId: "foo/123", pinned: false, priority: 9});
    });

    afterEach(async () => {
        expect(db).toBeTruthy();
        await db.close();
        await dropDatabase(dbname);
    });

    it("can get csum mementos", async () => {
        let csumMementos: ConvSummaryMetaData[] = [];
        await db.pool.connect(async (conn: CommonQueryMethods) => {
            csumMementos = await db.get_csum_mementos(conn);
        })
        expect(csumMementos.length).toBe(2);
        expect(csumMementos[0]).toBeTypeOf("object");
        expect(csumMementos.find((m: ConvSummaryMetaData) => m.content === "test conversation summary")).toBeTruthy();
        expect(csumMementos.find((m: ConvSummaryMetaData) => m.content === "bogus")).toBeTruthy();
    });
});
