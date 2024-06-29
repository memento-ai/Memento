// Path: packages/postgres-db/src/memento.ts

import { Mem, MetaArgs, MetaId, createMem } from '@memento-ai/types'
import type { CommonQueryMethods, DatabasePool } from 'slonik'
import { insertMem, insertMeta, type ID } from '..'

export interface AddMementoArgs {
    pool: DatabasePool
    metaId: MetaId
    content: string
    metaArgs: MetaArgs
}

// Add a Mem and Meta to the database
export async function addMemento(args: AddMementoArgs): Promise<ID> {
    const { pool, metaId, content, metaArgs } = args

    // A Mem is entirely determined from its content, so we only pass in the content to this function,
    // and then construct the Mem from the content.
    const mem: Mem = await createMem(content)

    const result = await pool.connect(async (conn) => {
        return await addMementoWithConn({ conn, mem, metaId, metaArgs })
    })

    return result
}

export interface AddMementoWithConnArgs {
    conn: CommonQueryMethods
    mem: Mem
    metaId: string
    metaArgs: MetaArgs
}

// Add a Mem and Meta to the database using a connection for use within a transaction
export async function addMementoWithConn(args: AddMementoWithConnArgs): Promise<ID> {
    const { conn, mem, metaId, metaArgs } = args
    const memId = mem.id
    try {
        await insertMem(conn, mem)
        await insertMeta(conn, memId, metaId, metaArgs)
    } catch (err) {
        console.error((err as Error).stack)
        throw err
    }
    return { id: metaId }
}
