// Path: packages/memento-db/src/searchMemsBySimilarity.ts
// search.ts

import { SimilarityResult } from './mementoDb-types';
import { sql, type QueryResult, type QueryResultRow, type DatabasePool } from 'slonik';
import pgvector from 'pgvector';
import { DOC, CONV, DSUM } from '@memento-ai/types';
import { embedding } from '@memento-ai/embedding';
import { zodParse } from '@memento-ai/utils';

export async function searchMemsBySimilarity(dbPool: DatabasePool, userMessage: string, tokensLimit: number): Promise<SimilarityResult[]> {
    const queryEmbedding = await embedding.generateOne(userMessage);
    const queryVector = pgvector.toSql(queryEmbedding);

    return await dbPool.connect(async (conn) => {
        const result: QueryResult<QueryResultRow> = await conn.query(sql.unsafe`
            WITH cte AS (
                SELECT
                    m.id,
                    m.content,
                    mt.kind,
                    mt.source,
                    mt.created_at,
                    m.tokens,
                    m.embed_vector <=> ${queryVector} AS similarity,
                    SUM(m.tokens) OVER (ORDER BY m.embed_vector <=> ${queryVector} ASC) AS cumulative_tokens
                FROM
                    mem m
                JOIN
                    meta mt ON m.id = mt.memid
                WHERE
                    mt.kind IN (${DOC}, ${DSUM}, ${CONV})
            )
            SELECT
                id,
                content,
                kind,
                source,
                created_at,
                tokens,
                similarity
            FROM
                cte
            WHERE
                cumulative_tokens <= ${tokensLimit}
            ORDER BY
                similarity ASC
        `);

        return result.rows.map((row) => {
            try {
                const similarity: SimilarityResult = zodParse(SimilarityResult, row);
                return similarity;
            } catch (error) {
                console.error('Error parsing similarity result:', error);
                console.error(row);
                throw error;
            }
        });
    });
}
