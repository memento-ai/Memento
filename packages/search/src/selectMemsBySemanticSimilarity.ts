// Path: packages/search/src/selectMemsBySemanticSimilarity.ts

import { embedding } from '@memento-ai/embedding'
import debug from 'debug'
import pgvector from 'pgvector'
import type { DatabasePool } from 'slonik'
import { sql } from 'slonik'
import { MementoSearchArgs, MementoSearchResult } from './mementoSearchTypes'
import { linearNormalize } from './normalize'

const dlog = debug('selectMemsBySemanticSimilarity')

// Semantic similarity assigns a score in the range [0, 1] to each memento using cosign similarity.
// The higher the score, the more semantically similar the memento is to the query content.
// The full [0, 1] range is achieved by linearly normalizing the scores.

export async function selectMemsBySemanticSimilarity(
    dbPool: DatabasePool,
    args: MementoSearchArgs
): Promise<MementoSearchResult[]> {
    const { content, max_tokens } = MementoSearchArgs.parse(args)
    dlog(`selectMemsBySemanticSimilarity: max_tokens:${max_tokens} content: ${content.slice(0, 50)}...`)

    if (content.length === 0) {
        return []
    }

    const queryEmbedding = await embedding.generateOne(content)
    const queryVector = pgvector.toSql(queryEmbedding)

    const query = sql.type(MementoSearchResult)`
        WITH cte AS (
            SELECT
                meta.id as id,
                kind,
                source,
                docid,
                summaryid,
                created_at,
                tokens,
                content,
                1.0 - (embed_vector <=> ${queryVector}) AS score,
                SUM(tokens) OVER (ORDER BY embed_vector <=> ${queryVector} ASC) AS cumulative_tokens
            FROM
                meta
            JOIN
                mem ON meta.memid = mem.id
            WHERE
                embed_vector IS NOT NULL
                AND kind in ('doc', 'dsum', 'xchg')
        )
        SELECT
            id,
            kind,
            source,
            docid,
            summaryid,
            tokens,
            score,
            content,
            created_at
        FROM
            cte
        WHERE
            cumulative_tokens <= ${max_tokens}
    `
    const result: MementoSearchResult[] = await dbPool.connect(async (connection) => {
        const result = await connection
            .query(query)
            .then((result) => result.rows.map((row) => row))
            .catch((err) => {
                Error.captureStackTrace(err)
                console.error('While selecting mementos by semantic similarity:', { content, max_tokens })
                console.error(err.stack)
                throw err
            })
        return result
    })

    return linearNormalize(result, (m) => m.score)
}
