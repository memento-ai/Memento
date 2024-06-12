// Path: packages/resolution-agent/src/resolutionAgent.test.ts

import { expect, it, describe, beforeEach, afterEach } from "bun:test";
import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import { ResolutionAgent } from "./resolutionAgent";
import { MementoDb } from "@memento-ai/memento-db";
import { MementoAgent } from "@memento-ai/memento-agent";
import { nanoid } from "nanoid";
import { type Interceptor } from "slonik";
import debug from "debug";
import { makeTestSystem, type MementoSystem } from "@memento-ai/system";

const dlog = debug("resolutionAgent:test");

const interceptors: Interceptor[] = [{queryExecutionError: async (e, query) => { dlog({e, query}); return null; }}];

describe("ResolutionAgent", () => {

    let db: MementoDb;
    let dbname: string;
    let system: MementoSystem;
    let mementoAgent: MementoAgent;
    let resolutionAgent: ResolutionAgent;
    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname, interceptors);
        system = await makeTestSystem({database: dbname, resolution: true});

        db = system.db;
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();

        mementoAgent = system.mementoAgent;

        if (system.resolutionAgent == undefined) {
            throw new Error("Resolution agent is undefined");
        }
        resolutionAgent = system.resolutionAgent;
    });

    afterEach(async () => {
        try {
            await db.close(); // this will close the DB
            await dropDatabase(dbname);
        }
        catch (e) {
            const err = e as Error;
            dlog(err.message);
            dlog(err.stack);
        }
    });

    // TODO

});
