// Path: packages/search/src/selectMemsBySemanticSimilarity.ts

import { DOC, DSUM, CONV, SYN, XCHG } from '@memento-ai/types';
import { embedding } from '@memento-ai/embedding';
import { MementoSearchResult } from './mementoSearchResult';
import { MemKind, MemKindValues } from '@memento-ai/types';
import { sql } from 'slonik';
import { z } from 'zod';
import { zodParse } from '@memento-ai/utils';
import pgvector from 'pgvector';
import type { QueryResult, DatabasePool } from 'slonik';

export const SimilarityScore = z.object({
    id: z.string(),
    kind: MemKind,
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
export type SimilarityIndex = Record<MemKind, Set<string>>;

function makeEmptySimilarityIndex(): SimilarityIndex {
    const index: Partial<SimilarityIndex> = {};
    for (const kind of MemKindValues) {
        index[kind] = new Set();
    }
    return index as SimilarityIndex;
}

export function makeSimilarityIndex(similarityMap: SimilarityMap): SimilarityIndex {
    const index: SimilarityIndex = makeEmptySimilarityIndex();
    for (const [id, similarity] of Object.entries(similarityMap)) {
        const { kind } = similarity;
        index[kind].add(id);
        switch (kind) {
            case DOC: {
                const { summaryid } = similarity;
                if (!!summaryid) { index[DSUM].add(summaryid); }
                break;
            }
            case DSUM: {
                const { docid } = similarity;
                if (!!docid) { index[DOC].add(docid); }
                break;
            }
            case CONV: {
                const { docid } = similarity;
                if (!!docid) { index[XCHG].add(docid); }
                break;
            }
            case SYN: {
                const { docid } = similarity;
                if (!!docid) { index[XCHG].add(docid); }
                break;
            }
            case XCHG: {
                const { summaryid } = similarity;
                if (!!summaryid) { index[SYN].add(summaryid); }
                break;
            }
        }
    }
    return index;
}

export async function loadMementoSet(dbPool: DatabasePool, idSet: Set<string>): Promise<MementoSearchResult[]> {
    const idArray: string[] = Array.from(idSet);
    const result = await dbPool.connect(async (conn) => {
        const query = sql.type(MementoSearchResult)`
            SELECT
                id,
                tokens,
                content,
                source,
                kind
            FROM
                memento
            WHERE
                id = ANY(${sql.array(idArray, sql.fragment`varchar[]`)})
            ORDER BY created_at ASC
        `;
        return await conn.query(query);
    });
    return result.rows.map((row: MementoSearchResult) => row);
}

export async function selectMemsBySemanticSimilarity(dbPool: DatabasePool, userMessage: string, tokensLimit: number): Promise<SimilarityMap> {
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
