// Path: packages/search/src/selectMemsBySemanticSimilarity.ts

import { embedding } from '@memento-ai/embedding';
import { linearNormalize } from './normalize';
import { MementoSearchResult } from './mementoSearchTypes';
import { sql } from 'slonik';
import pgvector from 'pgvector';
import type { MementoSearchArgs } from './mementoSearchTypes';
import type { QueryResult, DatabasePool } from 'slonik';

// Semantic similarity assigns a score in the range [0, 1] to each memento using cosign similarity.
// The higher the score, the more semantically similar the memento is to the query content.
// The full [0, 1] range is achieved by linearly normalizing the scores.

export async function selectMemsBySemanticSimilarity(dbPool: DatabasePool, args: MementoSearchArgs): Promise<MementoSearchResult[]> {

    const { content, maxTokens=10000 } = args;
    const queryEmbedding = await embedding.generateOne(content);
    const queryVector = pgvector.toSql(queryEmbedding);

    let result = await dbPool.connect(async (conn) => {
        const result: QueryResult<MementoSearchResult> = await conn.query(sql.type(MementoSearchResult)`
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
