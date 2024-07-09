import { DatabasePool, sql } from 'slonik';
import { ConversationMemento } from '@memento-ai/types';
import { connectReadonlyDatabase } from '@memento-ai/postgres-db';

export async function queryMementos(dbName: string, startDate: Date, endDate: Date): Promise<ConversationMemento[]> {
  const pool = await connectReadonlyDatabase(dbName);
  try {
    return await getConversationByDateRange(pool, startDate, endDate);
  } finally {
    await pool.end();
  }
}

async function getConversationByDateRange(pool: DatabasePool, startDate: Date, endDate: Date): Promise<ConversationMemento[]> {
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
      kind IN ('conv', 'xchg')
      AND created_at BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
    ORDER BY
      created_at ASC
  `);

  return result.rows.map(r => r);
}
