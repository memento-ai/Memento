// Path: packages/memento-db/src/searchMemsBySimilarity.ts

// search.ts

import { sql, type QueryResult, type QueryResultRow, type DatabasePool } from 'slonik';
import pgvector from 'pgvector';
import { embedding } from '@memento-ai/embedding';
import { zodParse } from '@memento-ai/utils';
import { z } from 'zod';

export const SimilarityScore = z.object({
    id: z.string(),
    kind: z.string(),
    tokens: z.number(),
    similarity: z.number(),
    content: z.string(),
    source: z.string().optional().nullable(),
    docid: z.string().optional().nullable(),
    summaryid: z.string().optional().nullable(),
    created_at: z.coerce.date(),
});
export type SimilarityScore = z.TypeOf<typeof SimilarityScore>;

export type SimilarityMap = Record<string, SimilarityScore>;

export async function scoreMemsBySimilarity(dbPool: DatabasePool, userMessage: string, tokensLimit: number): Promise<SimilarityMap> {
    const queryEmbedding = await embedding.generateOne(userMessage);
    const queryVector = pgvector.toSql(queryEmbedding);

    const resultMap: SimilarityMap = {};
    await dbPool.connect(async (conn) => {
        const result: QueryResult<SimilarityScore> = await conn.query(sql.type(SimilarityScore)`
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
                    1.0 - (m.embed_vector <=> ${queryVector}) AS similarity,
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
                similarity,
                content,
                created_at
            FROM
                cte
            WHERE
                cumulative_tokens <= ${tokensLimit}
        `);

        result.rows.forEach((row) => {
            try {
                const similarity: SimilarityScore = zodParse(SimilarityScore, row);
                resultMap[similarity.id] = similarity;
            } catch (error) {
                console.error('Error parsing similarity result:', error);
                console.error(row);
                throw error;
            }
        });
    });

    return resultMap;
}
