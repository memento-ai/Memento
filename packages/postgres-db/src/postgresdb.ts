// Path: packages/postgres-db/src/postgresdb.ts
import {
    sql,
    createPool,
    type DatabasePool,
    type CommonQueryMethods,
    type Interceptor,
  } from 'slonik';

import { executeFileQuery } from './rawQueries';
import fs from 'node:fs';

import debug from 'debug';

const dlog = debug('postgresdb');

(BigInt.prototype as unknown as any).toJSON = function() { return this.toString() }

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

export async function connectDatabase(dbname: string, interceptors: Interceptor[] = []): Promise<DatabasePool> {
    return await createPool(`postgres://localhost/${dbname}`, { interceptors });
}

const readonlyUser = 'claude';

export async function connectReadonlyDatabase(dbname: string, interceptors: Interceptor[] =[]): Promise<DatabasePool> {
    return createPool(`postgres://${readonlyUser}@localhost/${dbname}`, { interceptors });
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

export function getDatabaseSchema() : string {
    const databaseSchema = [
        fs.readFileSync(`${import.meta.dir}/../sql/mem_table.sql`, 'utf8'),
        fs.readFileSync(`${import.meta.dir}/../sql/meta_table.sql`, 'utf8'),
        fs.readFileSync(`${import.meta.dir}/../sql/memento_view.sql`, 'utf8'),
    ].join('\n');
    return databaseSchema;
}

export async function createMementoDb(dbname: string, interceptors: Interceptor[] =[]): Promise<void> {
    try {
        await createNewEmptyDatabase(dbname);
        const pool: DatabasePool = await connectDatabase(dbname, interceptors);

        await pool.connect(async (conn: CommonQueryMethods) => {
            await conn.query(sql.unsafe`CREATE EXTENSION vector`);

            /// MEM CONTENT
            await executeFileQuery(conn, 'mem_table.sql');

            /// MEM METADATA
            await executeFileQuery(conn, 'meta_table.sql');

            /// Memento Unified View
            await executeFileQuery(conn, 'memento_view.sql');

            /// Stored Procedure insert_single_mem_meta
            await executeFileQuery(conn, 'insert_single_mem_meta.sql');

            /// Stored Procedure insert_related_mem_meta
            await executeFileQuery(conn, 'insert_related_mem_meta.sql');

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
