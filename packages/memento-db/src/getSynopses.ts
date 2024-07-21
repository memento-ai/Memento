// Path: packages/memento-db/src/getSynopses.ts

import { SynopsisMemento } from '@memento-ai/types'
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

export type GetRecentSynopsesArgs = {
    limit: number
}

export const RecentSynopsis = SynopsisMemento.pick({
    id: true,
    content: true,
    docid: true,
    created_at: true,
})
export type RecentSynopsis = z.infer<typeof RecentSynopsis>

export async function getRecentSynopses(pool: DatabasePool, args: GetRecentSynopsesArgs): Promise<RecentSynopsis[]> {
    const { limit } = args
    const query = sql.type(RecentSynopsis)`
        WITH cte AS (
            SELECT id, docid, content, created_at
            FROM memento
            WHERE kind = 'syn'
            ORDER BY created_at DESC
            LIMIT ${limit}
        )
        SELECT *
        FROM cte
        ORDER by created_at
        `
    const result = await pool.query(query)
    return result.rows.map((row) => row)
}
