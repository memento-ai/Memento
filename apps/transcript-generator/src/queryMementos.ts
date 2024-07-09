import { DatabasePool } from 'slonik';
import { Memento, z } from '@memento-ai/types';
import { connectReadonlyDatabase } from '@memento-ai/postgres-db';
import { sql } from 'slonik';

// Define a more specific type using Zod's pick
const ConversationMemento = Memento.pick({
  content: true,
  role: true,
  created_at: true,
  kind: true,
  docid: true
});

type ConversationMemento = z.infer<typeof ConversationMemento>;

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
      AND created_at BETWEEN ${startDate} AND ${endDate}
    ORDER BY
      created_at ASC
  `);

  return result.rows;
}
