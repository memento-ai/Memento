import {
    sql,
    createPool,
    type DatabasePool,
    type QueryResult,
    type QueryResultRow,
    type CommonQueryMethods
  } from 'slonik';

import { Mem, MetaArgs, CONV, DOC, FRAG, SYS, DSUM, CSUM, type Message } from '@memento-ai/types';
import { embedding } from '@memento-ai/embedding';
import { count_tokens } from '@memento-ai/encoding';
import { raw } from 'slonik-sql-tag-raw';
import fs from 'node:fs';

import debug from 'debug';

const dlog = debug('postgresdb');


/// Create a new database. Due to requirements imposed by the slonik API, we must first create
/// a pool to an existing database where the owner of the DB has privileges to create new databases.
/// Note that we do NOT use `IF NOT EXISTS`. We want an error if the DB already exists.
export async function createNewEmptyDatabase(dbname: string) {
    dlog("Creating new database " + dbname);
    const rootPool: DatabasePool = await createPool(`postgres://localhost`);
    await rootPool.query(sql.unsafe`CREATE DATABASE ${sql.identifier([dbname])}`);
    await rootPool.end();
    dlog(`Database ${dbname} created`);
}

/// Drop a database. Again, we connect to the root DB and execute the DROP there
export async function dropDatabase(dbname: string) {
    dlog(`Dropping database ${dbname}`);
    const rootPool: DatabasePool = await createPool(`postgres://localhost`);
    await rootPool.query(sql.unsafe`DROP DATABASE IF EXISTS ${sql.identifier([dbname])}`);
    await rootPool.end();
    dlog(`Database ${dbname} dropped`);
}

export async function wipeDatabase(dbname: string) {
    // TODO: would it be marginally better to just TRUNCATE the tables?
    dlog(`Wiping database ${dbname}`);
    await dropDatabase(dbname);
    await createMementoDb(dbname);
    dlog(`Database ${dbname} wiped`);
}

export async function connectDatabase(dbname: string): Promise<DatabasePool> {
    return await createPool(`postgres://localhost/${dbname}`);
}

const readonlyUser = 'claude';

export async function connectReadonlyDatabase(dbname: string): Promise<DatabasePool> {
    return createPool(`postgres://${readonlyUser}@localhost/${dbname}`);
}

/// We create two tables: `mem` and `meta`.
/// `mem` contains the actual content and its embedding.
/// `meta` contains the metadata and various attributes.
/// A `mem` is entirely determined by its content, is immutable and distinct
/// A `meta` is a "pointer" to a `mem`, and is mutable.
/// Multiple meta can point to the same mem, but any given meta points to exactly one mem.
/// The likelihood of one mem being used multiple times (i.e. pointed to by different mems)
/// is low, but it is not zero. We will need to handle this case. It will come up in testing
/// where the USER might ask multiple questions that are the same, e.g. "Why is the sky blue?".


// role: z.optional(Role),
// docId: z.optional(z.string()),
// source: z.optional(z.string()),
// summaryId: z.optional(z.string()),

async function executeFileQuery(conn: CommonQueryMethods, filePath: string) {
    const fullPath = `${import.meta.dir}/../${filePath}`;
    const file = Bun.file(fullPath);
    const text = await file.text();
    const sqlFragment = raw(text, []);
    await conn.query(sql.unsafe`${sqlFragment}`);
}

export function getDatabaseSchema() : string {
    const databaseSchema = [
        fs.readFileSync(`${import.meta.dir}/../sql/mem_table.sql`, 'utf8'),
        fs.readFileSync(`${import.meta.dir}/../sql/meta_table.sql`, 'utf8'),
        fs.readFileSync(`${import.meta.dir}/../sql/memento_view.sql`, 'utf8'),
    ].join('\n');
    return databaseSchema;
}

export async function createMementoDb(dbname: string): Promise<void> {
    try {
        await createNewEmptyDatabase(dbname);
        const pool: DatabasePool = await connectDatabase(dbname);

        await pool.connect(async (conn: CommonQueryMethods) => {
            await conn.query(sql.unsafe`CREATE EXTENSION vector`);

            /// MEM CONTENT
            await executeFileQuery(conn, 'sql/mem_table.sql');

            /// MEM METADATA
            await executeFileQuery(conn, 'sql/meta_table.sql');
            // await conn.query(sql.unsafe`
            //     CREATE TABLE meta(
            //         id VARCHAR(21) PRIMARY KEY,   -- nanoid
            //         memId VARCHAR(24) REFERENCES mem(id),
            //         kind VARCHAR(4) NOT NULL,
            //         pinned BOOLEAN DEFAULT FALSE,
            //         priority INT DEFAULT 0,   -- 0 is low priority. high priority is unbounded
            //         role VARCHAR(10),          -- can only be "user" or "assistant". Should we use enum instead?
            //         docId VARCHAR(24),
            //         source VARCHAR(128),
            //         summaryId VARCHAR(24),
            //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
            // `);

            /// Memento Unified View
            await executeFileQuery(conn, 'sql/memento_view.sql');

            /// Stored Procedure insert_single_mem_meta
            await executeFileQuery(conn, 'sql/insert_single_mem_meta.sql');

            /// Stored Procedure insert_related_mem_meta
            await executeFileQuery(conn, 'sql/insert_related_mem_meta.sql');

            /// Indexes -- we have yet to determine empirically when indexes are actually useful
            /// These are just some obvious guesses.
            await conn.query(sql.unsafe`CREATE INDEX idx_mem_tssearch ON mem USING GIN(tssearch)`);
            await conn.query(sql.unsafe`CREATE INDEX idx_meta_kind ON meta (kind)`);
            await conn.query(sql.unsafe`CREATE INDEX idx_meta_pinned ON meta (pinned)`);
            await conn.query(sql.unsafe`CREATE INDEX idx_meta_priority ON meta (priority)`);
            await conn.query(sql.unsafe`CREATE INDEX idx_meta_created_at ON meta (created_at)`);

            // /// Create a readonly user
            await conn.query(sql.unsafe`GRANT pg_read_all_data TO ${sql.identifier([readonlyUser])}`);
        });

        await pool.end();
    } catch (error) {
        console.error('Error creating memento database:', error);
        throw error;
    }
}

export async function createMem(content: string) : Promise<Mem> {
    const hasher = new Bun.CryptoHasher("md4");
    hasher.update(content);
    const id = hasher.digest('base64');
    const mem: Mem = Mem.parse({
        id,
        content: content,
        embed_vector: await embedding.generateOne(content),
        tokens: count_tokens(content)
    })
    return mem;
}

export type ID = { id: string }

export interface AddMemArgs {
    pool: DatabasePool,
    metaId: string,
    content: string,
    metaArgs: MetaArgs
}

export async function addMem(args: AddMemArgs): Promise<ID> {
    const { pool, metaId, content, metaArgs } = args;

    // A Mem is entirely determined from its content, so we only pass in the content to this function,
    // and then construct the Mem from the content.
    const mem: Mem = await createMem(content);
    const embed_vector = JSON.stringify(mem.embed_vector);

    return await pool.connect(async conn => {
        try {
            await conn.query(sql.unsafe`
                INSERT INTO mem (id, content, embed_vector, tokens)
                VALUES (${mem.id}, ${mem.content}, ${ embed_vector }, ${mem.tokens})
                ON CONFLICT (id) DO NOTHING;`)
        } catch (err) {
            console.error((err as Error).stack)
            throw err;
        }

        const { kind } = metaArgs;

        try {
            switch (metaArgs.kind) {
                case SYS:
                    await conn.query(sql.unsafe`
                        INSERT INTO meta (id, memId, kind, pinned, priority)
                        VALUES (${metaId}, ${mem.id}, ${metaArgs.kind}, ${metaArgs.pinned}, ${metaArgs.priority})
                        RETURNING id`);
                    break;
                case CONV:
                    metaArgs.source = 'conversation';
                    await conn.query(sql.unsafe`
                        INSERT INTO meta (id, memId, kind, role, source, priority)
                        VALUES (${metaId}, ${mem.id}, ${metaArgs.kind}, ${metaArgs.role}, ${metaArgs.source}, ${metaArgs.priority})
                        RETURNING id`);
                    break;
                case FRAG:
                    await conn.query(sql.unsafe`
                        INSERT INTO meta (id, memId, kind, docId)
                        VALUES (${metaId}, ${mem.id}, ${metaArgs.kind}, ${metaArgs.docId})
                        RETURNING id`);
                    break;
                case DOC:
                    await conn.query(sql.unsafe`
                        INSERT INTO meta (id, memId, kind, source, summaryId)
                        VALUES (${metaId}, ${mem.id}, ${metaArgs.kind}, ${metaArgs.source}, ${metaArgs.summaryId})
                        RETURNING id`);
                    break;
                case DSUM:
                    await conn.query(sql.unsafe`
                        INSERT INTO meta (id, memId, kind, docId, source)
                        VALUES (${metaId}, ${mem.id}, ${metaArgs.kind}, ${metaArgs.docId}, ${metaArgs.source})
                        RETURNING id`);
                    break;
                case CSUM:
                    await conn.query(sql.unsafe`
                        INSERT INTO meta (id, memId, kind, pinned, priority)
                        VALUES (${metaId}, ${mem.id}, ${metaArgs.kind}, ${metaArgs.pinned}, ${metaArgs.priority})
                        RETURNING id`);
                    break;
                default:
                    throw new Error(`Unsupported MemMetaData kind: ${kind}`);
            }
        } catch (err) {
            console.error((err as Error).stack)
            throw err;
        }

        return { ...metaArgs, id: metaId, memId: mem.id };
    });
}

export interface AddDocAndSummaryArgs {
    pool: DatabasePool,
    source: string,
    content: string,
    summary: string
}
export interface DocAndSummaryResult {
    docId: string;
    summaryId: string;
}

export async function getSystemPrompts(pool: DatabasePool): Promise<string[]> {
    let prompts: QueryResult<QueryResultRow>;
    let result: string[] = [];
    await pool.connect(async conn => {
        prompts = await conn.query(sql.unsafe`
        SELECT content
        FROM meta
        LEFT JOIN mem
        ON mem.id = meta.memId
        WHERE kind = ${SYS} and pinned = TRUE
        ORDER BY priority DESC`);
        result = prompts.rows.map(row => row.content as string);
    });
    return result;
}

export async function getConversation(pool: DatabasePool, maxMessagePairs: number = 10): Promise<Message[]> {
    let result: Message[] = [];
    await pool.connect(async conn => {
        const conversation = await conn.query(sql.unsafe`
            WITH recent_messages AS (
                SELECT
                m.content,
                mt.role,
                mt.created_at
                FROM
                meta mt
                JOIN
                mem m ON m.id = mt.memid
                WHERE
                mt.kind = 'conv'
                ORDER BY
                mt.created_at DESC
                LIMIT ${maxMessagePairs} * 2
            )
            SELECT
                content,
                role
            FROM
                recent_messages
            ORDER BY
                created_at ASC;
            `);
        result = conversation.rows.map(({role, content}) => ({ role, content }));
    });
    return result;
}

export async function cleanUpLastUserMem(pool: DatabasePool) {
    // If the most recent conv mem is role: USER, then it is because the app crashed
    // before the assistant could respond. We should delete it.
    await pool.connect(async conn => {
        const lastUserMem = await conn.query(sql.unsafe`
            SELECT id, role, content
            FROM memento
            WHERE kind = 'conv'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        if (lastUserMem.rows.length > 0 && lastUserMem.rows[0].role === 'user') {
            const { id, content } = lastUserMem.rows[0];
            console.log("Whoops! Looks like we crashed before the assistant could respond. Cleaning up...")
            console.log('Deleting user message:\n', content)
            // This will leave the mem in the database, but it will be orphaned, and can be garbage collected later.
            await conn.query(sql.unsafe`
                DELETE FROM meta
                WHERE id = ${id}
            `);
        } else {
            dlog("No user mem to clean up");
        }
    });
}
