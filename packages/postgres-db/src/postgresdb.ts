// Path: packages/postgres-db/src/postgresdb.ts

import { createPool, sql, type CommonQueryMethods, type DatabasePool, type Interceptor } from 'slonik'

import fs from 'node:fs'
import { executeFileQuery } from './rawQueries'

import debug from 'debug'

const dlog = debug('postgresdb')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(BigInt.prototype as unknown as any).toJSON = function () {
    return this.toString()
}

export async function listDatabases(): Promise<string[]> {
    const rootPool: DatabasePool = await createPool(`postgres://localhost`)
    const result = await rootPool.query(sql.unsafe`SELECT datname FROM pg_database WHERE datistemplate = false`)
    await rootPool.end()
    return result.rows.map((row) => row.datname)
}

export async function databaseExists(dbname: string): Promise<boolean> {
    const rootPool: DatabasePool = await createPool(`postgres://localhost`)
    const result = await rootPool.exists(sql.unsafe`SELECT FROM pg_database WHERE datname = ${dbname}`)
    await rootPool.end()
    return result
}

/// Create a new database. Due to requirements imposed by the slonik API, we must first create
/// a pool to an existing database where the owner of the DB has privileges to create new databases.
/// Note that we do NOT use `IF NOT EXISTS`. We want an error if the DB already exists.
export async function createNewEmptyDatabase(dbname: string) {
    dlog('Creating new database ' + dbname)
    const rootPool: DatabasePool = await createPool(`postgres://localhost`)
    await rootPool.query(sql.unsafe`CREATE DATABASE ${sql.identifier([dbname])}`)
    await rootPool.end()
    dlog(`Database ${dbname} created`)
}

/// Drop a database. Again, we connect to the root DB and execute the DROP there
export async function dropDatabase(dbname: string) {
    dlog(`Dropping database ${dbname}`)
    const rootPool: DatabasePool = await createPool(`postgres://localhost`)
    await rootPool.query(sql.unsafe`DROP DATABASE IF EXISTS ${sql.identifier([dbname])}`)
    await rootPool.end()
    dlog(`Database ${dbname} dropped`)
}

export async function wipeDatabase(dbname: string) {
    dlog(`Wiping database ${dbname}`)
    await dropDatabase(dbname)
    await createMementoDb(dbname)
    dlog(`Database ${dbname} wiped`)
}

export async function connectDatabase(dbname: string, interceptors: Interceptor[] = []): Promise<DatabasePool> {
    return await createPool(`postgres://localhost/${dbname}`, { interceptors })
}

const readonlyUser = 'claude'

export async function connectReadonlyDatabase(dbname: string, interceptors: Interceptor[] = []): Promise<DatabasePool> {
    return createPool(`postgres://${readonlyUser}@localhost/${dbname}`, { interceptors })
}

/// We create two tables: `mem` and `meta`.
/// `mem` contains the actual content and its embedding.
/// `meta` contains the metadata and various attributes.
/// A `mem` is entirely determined by its content, is immutable and distinct
/// A `meta` is a "pointer" to a `mem`, and is mutable.
/// Multiple meta can point to the same mem, but any given meta points to exactly one mem.

export function getDatabaseSchema(): string {
    const databaseSchema = [
        fs.readFileSync(`${import.meta.dir}/../sql/mem_table.sql`, 'utf8'),
        fs.readFileSync(`${import.meta.dir}/../sql/meta_table.sql`, 'utf8'),
        fs.readFileSync(`${import.meta.dir}/../sql/memento_view.sql`, 'utf8'),
    ].join('\n')
    return databaseSchema
}

export async function createMementoDb(dbname: string, interceptors: Interceptor[] = []): Promise<void> {
    try {
        await createNewEmptyDatabase(dbname)
        const pool: DatabasePool = await connectDatabase(dbname, interceptors)

        await pool.connect(async (conn: CommonQueryMethods) => {
            await conn.query(sql.unsafe`CREATE EXTENSION vector`)

            /// MEM CONTENT
            await executeFileQuery(conn, 'mem_table.sql')

            /// MEM METADATA
            await executeFileQuery(conn, 'meta_table.sql')

            /// Memento Unified View
            await executeFileQuery(conn, 'memento_view.sql')

            /// Indexes -- we have yet to determine empirically when indexes are actually useful
            /// These are just some obvious guesses.
            await conn.query(sql.unsafe`CREATE INDEX idx_mem_tssearch ON mem USING GIN(tssearch)`)
            await conn.query(sql.unsafe`CREATE INDEX idx_meta_kind ON meta (kind)`)
            await conn.query(sql.unsafe`CREATE INDEX idx_meta_pinned ON meta (pinned)`)
            await conn.query(sql.unsafe`CREATE INDEX idx_meta_priority ON meta (priority)`)
            await conn.query(sql.unsafe`CREATE INDEX idx_meta_created_at ON meta (created_at)`)

            /// Create a readonly user
            await conn.query(sql.unsafe`GRANT pg_read_all_data TO ${sql.identifier([readonlyUser])}`)
        })

        await pool.end()
    } catch (error) {
        console.error('Error creating memento database:', error)
        throw error
    }
}
