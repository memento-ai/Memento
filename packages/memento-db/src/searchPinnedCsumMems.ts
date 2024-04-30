// Path: packages/memento-db/src/searchPinnedCsumMems.ts

import { type ConvSummaryMemento } from '@memento-ai/types';
import { sql, type DatabasePool } from 'slonik';

export async function searchPinnedCsumMems(pool: DatabasePool, tokenLimit: number): Promise<ConvSummaryMemento[]> {
    const query = sql.unsafe`
      SELECT id, content, pinned, priority
      FROM (
        SELECT id, content, pinned, priority, tokens,
               SUM(tokens) OVER (ORDER BY priority DESC, id) AS cumulative_tokens
        FROM memento
        WHERE kind = 'csum' AND pinned = true
        ORDER BY priority DESC, id
      ) AS subquery
      WHERE cumulative_tokens <= ${tokenLimit}
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row as ConvSummaryMemento);
}
