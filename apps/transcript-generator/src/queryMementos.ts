import { Memento } from '@memento-ai/types';
import { connectReadonlyDatabase } from '@memento-ai/postgres-db';

export async function queryMementos(dbName: string, startDate: Date, endDate: Date): Promise<Memento[]> {
  const pool = await connectReadonlyDatabase(dbName);
  try {
    const query = `
      SELECT * FROM memento
      WHERE kind IN ('conv', 'xchg')
      AND created_at BETWEEN $1 AND $2
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows as Memento[];
  } finally {
    await pool.end();
  }
}
