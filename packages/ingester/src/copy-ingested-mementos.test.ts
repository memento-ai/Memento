// Path: packages/ingester/src/copy-ingested-mementos.test.ts

import { expect, describe, it, beforeEach, afterEach } from "bun:test";
import { MementoDb } from "@memento-ai/memento-db";
import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import { nanoid } from "nanoid";
import { ingestDirectory } from "./ingester";
import { getProjectRoot } from "@memento-ai/utils";
import { copyIngestedMementos } from './copy-ingested-mementos';


describe('copyIngestedMementos', () => {
    const timeout = 60000;

    let fromname: string;
    let toname: string;
    let fromdb: MementoDb;
    let todb: MementoDb;
    beforeEach(async () => {
        fromname = `test_${nanoid()}`;
        toname = `test_${nanoid()}`;
        await createMementoDb(fromname);
        await createMementoDb(toname);
        fromdb = await MementoDb.connect(fromname);
        todb = await MementoDb.connect(toname);
        expect(fromdb).toBeTruthy();
        expect(todb).toBeTruthy();
        expect(fromdb.name).toBe(fromname);
        expect(todb.name).toBe(toname);
        expect(fromdb.pool).toBeTruthy();
        expect(todb.pool).toBeTruthy();
    });

    afterEach(async () => {
        expect(fromdb).toBeTruthy();
        await fromdb.close();
        expect(todb).toBeTruthy();
        await todb.close();
        await dropDatabase(fromname);
        await dropDatabase(toname);
    });

    it('should copy ingested mementos from one database to another', async () => {
        const projectRoot = getProjectRoot();
        await ingestDirectory({db: fromdb, dirPath: `${projectRoot}/packages/function-calling/src`});
        await copyIngestedMementos(fromdb.pool, todb.pool);
    }, timeout);
});
