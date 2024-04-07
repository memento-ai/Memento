import { expect, test } from "bun:test";
import { nanoid } from 'nanoid';
import { createNewEmptyDatabase, createMementoDb, dropDatabase, connectReadonlyDatabase } from './postgresdb';
import { sql } from 'slonik';

test("can create a new empty database and then drop it", async () => {
    const dbname = `test_${nanoid()}`;
    await createNewEmptyDatabase(dbname);
    await dropDatabase(dbname);
});


test("can create multiple empty databases", async () => {
    const dbname1 = `test_${nanoid()}`;
    const dbname2 = `test_${nanoid()}`;

    try {
        await createNewEmptyDatabase(dbname1);
        await createNewEmptyDatabase(dbname2);
    }
    finally {
        await dropDatabase(dbname1);
        await dropDatabase(dbname2);
    }
});

test("can create memento database", async () => {
    const dbname = `test_${nanoid()}`;
    await createMementoDb(dbname);
    await dropDatabase(dbname);
});

test("can create multiple memento databases", async () => {
    const dbname1 = `test_${nanoid()}`;
    const dbname2 = `test_${nanoid()}`;
    try {
        await createMementoDb(dbname1);
        await createMementoDb(dbname2);
    } finally {
        await dropDatabase(dbname1);
        await dropDatabase(dbname2);
    }
});

test("a new database can be connected with the readonly_user", async () => {
    const dbname = `test_${nanoid()}`;
    await createMementoDb(dbname);
    const readonlyPool = await connectReadonlyDatabase(dbname);
    // The user can read
    await readonlyPool.connect(async (conn) => {
        try {
            // The user cannot insert
            await conn.query(sql.unsafe`
                INSERT INTO mem (id, content, embed_vector, tokens)
                VALUES ('xxx', 'yyy', '[1, 2, 3]', 1)`);
            expect(false).toBeTruthy();   // should not reach here
        } catch (error) {
            expect(true).toBeTruthy();
        }
    });
    await readonlyPool.end();
    await dropDatabase(dbname);
})
