// Path: packages/search/src/extractKeywordsFromContent.ts

import type { DatabasePool } from 'slonik'
import { sql } from 'slonik'
import { z } from 'zod'
import type { MementoSearchArgs } from '..'

export const ExtractKeywordsFromContentResult = z.object({
    lexeme: z.string(),
    tf: z.number(),
    idf: z.number(),
    tf_idf: z.number(),
})
export type ExtractKeywordsFromContentResult = z.infer<typeof ExtractKeywordsFromContentResult>

export async function extractKeywordsFromContent(
    dbPool: DatabasePool,
    args: MementoSearchArgs
): Promise<ExtractKeywordsFromContentResult[]> {
    const { content, numKeywords = 5 } = args
    const query = sql.type(ExtractKeywordsFromContentResult)`
        WITH msg_stats AS (
            SELECT
            lexeme,
            COUNT(*) / (SELECT COUNT(*) FROM unnest(to_tsvector('english', ${content}))) AS tf
            FROM unnest(to_tsvector('english', ${content}))
            GROUP BY lexeme
        ),
        corpus_stats AS (
            SELECT
            word AS lexeme,
            LOG((SELECT COUNT(*) FROM memento) / ndoc)::NUMERIC AS idf
            FROM ts_stat('SELECT tssearch FROM memento')
        )
        SELECT
            msg_stats.lexeme,
            msg_stats.tf,
            corpus_stats.idf,
            msg_stats.tf * corpus_stats.idf AS tf_idf
        FROM msg_stats
        JOIN corpus_stats ON msg_stats.lexeme = corpus_stats.lexeme
        ORDER BY tf_idf DESC
        LIMIT ${numKeywords};
        `

    return dbPool.connect(async (connection) => {
        const result = await connection.query(query)
        return result.rows.map((row) => row)
    })
}
