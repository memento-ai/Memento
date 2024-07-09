import { MementoDb } from '@memento-ai/memento-db';
import { Memento } from '@memento-ai/types';

export async function queryMementos(startDate: Date, endDate: Date): Promise<Memento[]> {
  const db = await MementoDb.connect('transcript-db');
  try {
    const query = `
      SELECT * FROM memento
      WHERE kind IN ('conv', 'xchg')
      AND created_at BETWEEN $1 AND $2
      ORDER BY created_at ASC
    `;
    const result = await db.query(query, [startDate, endDate]);
    return result.rows as Memento[];
  } finally {
    await db.close();
  }
}
