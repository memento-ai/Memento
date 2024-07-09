// Path: packages/memento-db/src/getSynopses.ts

import { sql, type DatabasePool } from 'slonik'
import { z } from 'zod'

export type GetSynopsesArgs = {
    max_tokens: number
}

export async function getSynopses(pool: DatabasePool, args: GetSynopsesArgs): Promise<string[]> {
    const { max_tokens } = args
    if (max_tokens < 500) {
        throw new Error(`synopsis max_tokens must be at least 500, got ${max_tokens}`)
    }
    const query = sql.type(z.object({ content: z.string() }))`
        SELECT content
        FROM (
        SELECT id, content, tokens, created_at,
                SUM(tokens) OVER (ORDER BY created_at DESC, id) AS cumulative_tokens
        FROM memento
        WHERE kind = 'syn'
        ORDER BY created_at DESC
        ) AS subquery
        WHERE cumulative_tokens <= ${max_tokens}
        ORDER BY created_at;
    `
    const result = await pool
        .query(query)
        .then((result) => result.rows.map((row) => row.content))
        .catch((err) => {
            Error.captureStackTrace(err)
            console.error(err.stack)
            throw err
        })
    return result
}
