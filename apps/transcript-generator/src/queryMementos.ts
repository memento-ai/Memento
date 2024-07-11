// Path: apps/transcript-generator/src/queryMementos.ts

import { connectReadonlyDatabase } from '@memento-ai/postgres-db'
import { ConversationMemento } from '@memento-ai/types'
import { DatabasePool, sql } from 'slonik'

async function getConversationByDateRange(
    pool: DatabasePool,
    startDate: Date,
    endDate: Date,
): Promise<ConversationMemento[]> {
    const result = await pool.query(sql.type(ConversationMemento)`
    SELECT
      content,
      role,
      created_at,
      kind,
      docid
    FROM
      memento
    WHERE
      kind = 'conv'
      AND created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
    ORDER BY
      created_at ASC
  `)

    return result.rows.map((r) => r)
}

export async function queryMementos(
    databaseName: string,
    startDate: Date,
    endDate: Date,
): Promise<ConversationMemento[]> {
    const pool = await connectReadonlyDatabase(databaseName)
    try {
        return await getConversationByDateRange(pool, startDate, endDate)
    } finally {
        await pool.end()
    }
}
