import { expect, it, describe, beforeEach, afterEach} from "bun:test";
import { ingestFile, ingestDirectory, dropIngestedFiles, getIngestedFiles } from "./ingester";
import { nanoid } from "nanoid";
import { MementoDb } from "@memento-ai/memento-db";
import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import debug from "debug";
import { createMockSummarizer, type Summarizer } from "./summarizeDocument";

const dlog = debug("ingester");

describe("Ingester", () => {

    const timeout = 10000;

    const summarizer: Summarizer = createMockSummarizer();
    let db: MementoDb;
    let dbname: string;
    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        db = await MementoDb.create(dbname);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
    });

    afterEach(async () => {
        dlog(`Closing db: ${dbname}`)
        await db.close();
        dlog(`Dropping db: ${dbname}`)
        await dropDatabase(dbname);
        dlog(`Dropped db: ${dbname}`)
    });

    it("exercises beforeEach and afterEach", async () => {
        expect(dbname).toBeTruthy();
        dlog("dbname:", dbname);
        return expect(db).toBeTruthy();
    }, timeout);

    it("can ingest a file", async () => {
        expect(dbname).toBeTruthy();
        dlog("dbname:", dbname);
        return expect(async () => {await ingestFile(db, "packages/ingester/src/ingester.ts", summarizer)}).not.toThrow();
    }, timeout);

    it("can ingest a directory", async () => {
        await ingestDirectory(db, "packages", summarizer);
        const files = await getIngestedFiles(db);
        dlog("files:", files);
        expect(files.length).toBeGreaterThan(0);
        return expect(files).toContain("packages/ingester/src/ingester.ts");
    }, timeout);

    it("can ingest a directory and then drop ingest", async () => {
        await ingestDirectory(db, "packages", summarizer);
        await dropIngestedFiles(db);
        const files = await getIngestedFiles(db);
        return expect(files.length).toBe(0);
    }, timeout);

});
