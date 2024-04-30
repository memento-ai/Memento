// Path: packages/function-calling/src/functions/updateSummaries.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MementoDb } from '@memento-ai/memento-db';
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db';
import { nanoid } from 'nanoid';
import { CSUM } from '@memento-ai/types';
import { registry } from './index';
import debug from 'debug';
import { sql } from 'slonik';

const dlog = debug('updateSummaries');

describe('updateSummaries', () => {
    let db: MementoDb;
    let dbname: string;
    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        dlog(`Created database ${dbname}`);

        db = await MementoDb.create(dbname);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
    });

    afterEach(async () => {
        dlog(`Dropping database ${dbname}`);
        await db.close();
        await dropDatabase(dbname);
    });

    it('can add a new test summary', async () => {
        const updateSummaries = registry['updateSummaries'];
        expect(updateSummaries).toBeDefined();
        dlog(`Executing updateSummaries on ${dbname}`);
        await updateSummaries.fn({
            context: { pool: db.pool },
            updates: [
                { metaId: 'test/123', content: 'test conversation mem', pinned: true, priority: 1 },
            ]
        });
        let result: string[] = [];
        await db.pool.connect(async conn => {
            const csums = await conn.query(sql.unsafe`
            SELECT content
            FROM memento
            WHERE kind = ${CSUM}`);
            result = csums.rows.map(row => row.content as string);
        });
        expect(typeof result).toBe('object');
        expect(result.length).toBe(1);
        expect(result[0]).toInclude('test conversation mem');
    });

    it('can add two new test summaries', async () => {
        const updateSummaries = registry['updateSummaries'];
        expect(updateSummaries).toBeDefined();
        dlog(`Executing updateSummaries on ${dbname}`);
        await updateSummaries.fn({
            context: { pool: db.pool },
            updates: [
                { metaId: 'te-st/xy_12', content: 'test conversation mem', pinned: true, priority: 1 },
                { metaId: 'test/abc', content: 'another test' },
            ]
        });
        const result = await db.pool.query(sql.unsafe`
            SELECT id, content, pinned
            FROM memento
            WHERE kind = ${CSUM}`);
        const { rows } = result;
        expect(rows.length).toBe(2);
        const pinned = rows.filter(row => row.pinned);
        expect(pinned.length).toBe(1);
    });

    it('can modify a summary', async () => {
        const updateSummaries = registry['updateSummaries'];
        expect(updateSummaries).toBeDefined();
        dlog(`Executing updateSummaries on ${dbname}`);
        await updateSummaries.fn({
            context: { pool: db.pool },
            updates: [
                { metaId: 'test/123', content: 'test conversation mem', pinned: true, priority: 1 },
                { metaId: 'test/abc', content: 'another test' },
            ]
        });
        let result = await db.pool.query(sql.unsafe`
            SELECT id, content
            FROM memento
            WHERE kind = ${CSUM} and pinned = FALSE`);
        let { rows } = result;
        expect(rows.length).toBe(1);
        const { id } = rows[0];
        await updateSummaries.fn({
            context: { pool: db.pool },
            updates: [
                { metaId: id, content: 'modified', pinned: true, priority: 1 },
            ]
        });
        result = await db.pool.query(sql.unsafe`
            SELECT id, content
            FROM memento
            WHERE kind = ${CSUM} AND id = ${id}`);
        ({ rows } = result);
        expect(rows.length).toBe(1);
        expect(rows[0].content).toInclude('modified');
    });

    it('can pin/unpin without specifying content', async () => {
        const updateSummaries = registry['updateSummaries'];
        expect(updateSummaries).toBeDefined();
        dlog(`Executing updateSummaries on ${dbname}`);
        await updateSummaries.fn({
            context: { pool: db.pool },
            updates: [
                { metaId: 'test/123', content: 'test conversation mem', pinned: true, priority: 1 },
                { metaId: 'test/abc', content: 'another test' },
            ]
        });
        let result = await db.pool.query(sql.unsafe`
            SELECT id, content
            FROM memento
            WHERE kind = ${CSUM} and pinned = TRUE`);
        let { rows } = result;
        expect(rows.length).toBe(1);
        await updateSummaries.fn({
            context: { pool: db.pool },
            updates: [
                { metaId: 'test/abc', pinned: true },
            ]
        });
        result = await db.pool.query(sql.unsafe`
            SELECT id, content
            FROM memento
            WHERE kind = ${CSUM} AND pinned = TRUE`);
        ({ rows } = result);
        expect(rows.length).toBe(2);
    });


});
