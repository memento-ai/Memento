// Path: packages/memento-db/src/getSynopses.ts

import { sql, type DatabasePool } from 'slonik';

export async function getSynopses(pool: DatabasePool, tokenLimit: number): Promise<string[]> {
    const query = sql.unsafe`
        SELECT content
        FROM (
        SELECT id, content, tokens, created_at,
                SUM(tokens) OVER (ORDER BY created_at DESC, id) AS cumulative_tokens
        FROM memento
        WHERE kind = 'syn'
        ORDER BY created_at DESC
        ) AS subquery
        WHERE cumulative_tokens <= ${tokenLimit}
        ORDER BY created_at;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row.content);
}
