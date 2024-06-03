// Path: packages/search/src/selectMemsByKeywordSearch.ts

import { MementoSearchResult } from './mementoSearchTypes';
import { sql } from 'slonik';
import type { DatabasePool } from 'slonik';
import type { MementoSearchArgs } from './mementoSearchTypes';
import { extractKeywordsFromContent } from './extractKeywordsFromContent';
import { softmaxNormalize } from './softmaxNormalize';

// Keyword search assigns a score in the range [0, 1] to each memento.
// The higher the score, the more relevant the memento is to the query content.
// The [0, 1] range is achieved by normalizing the rank score with the normalization method 32.

export async function selectMemsByKeywordSearch(dbPool: DatabasePool, args : MementoSearchArgs): Promise<MementoSearchResult[]> {
    const { content, maxTokens=5000, numKeywords=5 } = args;
    const keywords = await extractKeywordsFromContent(dbPool, {content, numKeywords});

    const keywordQuery = keywords.map((keyword) => keyword.lexeme).join(' | ');

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
            score
        FROM mementos_with_running_sum
        WHERE total_tokens <= ${maxTokens}
        ORDER BY score DESC;`;

    const result = await dbPool.connect(async (connection) => {
        const result = await connection.query(query);
        return result.rows.map((row) => row);
    });

    return softmaxNormalize(result, (m) => m.score);
}
