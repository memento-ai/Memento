// Path: packages/search/src/selectMemsBySemanticSimilarity.ts

import { embedding } from '@memento-ai/embedding';
import { MementoSearchResult } from './mementoSearchTypes';
import { sql } from 'slonik';
import pgvector from 'pgvector';
import type { MementoSearchArgs } from './mementoSearchTypes';
import type { QueryResult, DatabasePool } from 'slonik';
import { linearNormalize, softmaxNormalize } from './normalize';

// Semantic similarity assigns a score in the range [0, 1] to each memento.
// The higher the score, the more semantically similar the memento is to the query content.

export async function selectMemsBySemanticSimilarity(dbPool: DatabasePool, args: MementoSearchArgs): Promise<MementoSearchResult[]> {

    const { content, maxTokens=10000 } = args;
    const queryEmbedding = await embedding.generateOne(content);
    const queryVector = pgvector.toSql(queryEmbedding);

    let result = await dbPool.connect(async (conn) => {
        const result: QueryResult<MementoSearchResult> = await conn.query(sql.type(MementoSearchResult)`
            WITH cte AS (
                SELECT
                    m.id,
                    mt.kind,
                    mt.source,
                    mt.docid,
                    mt.summaryid,
                    mt.created_at,
                    m.tokens,
                    m.content,
                    1.0 - (m.embed_vector <=> ${queryVector}) AS score,
                    SUM(m.tokens) OVER (ORDER BY m.embed_vector <=> ${queryVector} ASC) AS cumulative_tokens
                FROM
                    mem m
                JOIN
                    meta mt ON m.id = mt.memid
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
                cumulative_tokens <= ${maxTokens}
        `);
        return result.rows.map((row: MementoSearchResult) => row);
    });

    return linearNormalize(result, (m) => m.score);
}
