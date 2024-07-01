// Path: packages/search/src/selectMemsByKeywordSearch.ts

import debug from 'debug'
import type { DatabasePool } from 'slonik'
import { sql } from 'slonik'
import { extractKeywordsFromContent } from './extractKeywordsFromContent'
import type { MementoSearchArgs } from './mementoSearchTypes'
import { MementoSearchResult } from './mementoSearchTypes'
import { linearNormalize } from './normalize'

const dlog = debug('selectMemsByKeywordSearch')

// Keyword search assigns a score in the range [0, 1] to each memento.
// The higher the score, the more relevant the memento is to the query content.
// The [0, 1] range is achieved by normalizing the rank score with the normalization method 32
// and then linearly normalizing the scores to use the full the range [0, 1].

export async function queryMemsByKeywordSearch(
    dbPool: DatabasePool,
    args: MementoSearchArgs
): Promise<MementoSearchResult[]> {
    const { content, numKeywords = 5 } = args
    const keywords = await extractKeywordsFromContent(dbPool, { content, numKeywords })

    if (keywords.length === 0) {
        dlog('No keywords extracted from content:', content)
        return []
    }

    const keywordQuery = keywords.map((keyword) => keyword.lexeme).join(' | ')

    const query = sql.type(MementoSearchResult)`
        WITH query AS (
            SELECT to_tsquery('english', ${keywordQuery}) AS query
        ),
        ranked_mementos AS (
            SELECT
                m.id,
                m.kind,
                m.docid,
                m.summaryid,
                m.source,
                m.tokens,
                m.content,
                m.created_at,
                ts_rank(m.tssearch, query.query, 32) AS score   -- 32 is the normalization method
            FROM memento m, query
            WHERE m.tssearch @@ query.query
            ORDER BY score DESC
        )
        SELECT
            id,
            kind,
            docid,
            summaryid,
            source,
            tokens,
            content,
            created_at,
            score
        FROM ranked_mementos
        ORDER BY score DESC;`

    const result = await dbPool.connect(async (connection) => {
        const result = await connection.query(query)
        return result.rows.map((row) => {
            const { content: cont, ...rest } = row
            return { ...rest, content: cont.substring(0, 20) }
        })
    })
    return result
}

export async function selectMemsByKeywordSearch(
    dbPool: DatabasePool,
    args: MementoSearchArgs
): Promise<MementoSearchResult[]> {
    const { content, maxTokens = 5000, numKeywords = 5 } = args
    const keywords = await extractKeywordsFromContent(dbPool, { content, numKeywords })

    if (keywords.length === 0) {
        dlog('No keywords extracted from content:', content)
        return []
    }

    const keywordQuery = keywords.map((keyword) => keyword.lexeme).join(' | ')

    const query = sql.type(MementoSearchResult)`
        WITH query AS (
            SELECT to_tsquery('english', ${keywordQuery}) AS query
        ),
        ranked_mementos AS (
            SELECT
                m.id,
                m.kind,
                m.docid,
                m.summaryid,
                m.source,
                m.tokens,
                m.content,
                m.created_at,
                ts_rank(m.tssearch, query.query, 32) AS score   -- 32 is the normalization method
            FROM memento m, query
            WHERE m.tssearch @@ query.query
            ORDER BY score DESC
        ),
        mementos_with_running_sum AS (
            SELECT
                id,
                kind,
                docid,
                summaryid,
                source,
                tokens,
                content,
                created_at,
                score,
                SUM(tokens) OVER (ORDER BY score DESC) AS total_tokens
            FROM ranked_mementos
        )
        SELECT
            id,
            kind,
            docid,
            summaryid,
            source,
            tokens,
            content,
            created_at,
            score
        FROM mementos_with_running_sum
        WHERE total_tokens <= ${maxTokens}
        ORDER BY score DESC;`

    const result = await dbPool.connect(async (connection) => {
        const result = await connection.query(query)
        return result.rows.map((row) => row)
    })

    return linearNormalize(result, (m) => m.score)
}
