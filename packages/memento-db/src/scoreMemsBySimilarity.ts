// Path: packages/memento-db/src/scoreMemsBySimilarity.ts

import { sql, type QueryResult, type DatabasePool } from 'slonik';
import pgvector from 'pgvector';
import { embedding } from '@memento-ai/embedding';
import { zodParse } from '@memento-ai/utils';
import { z } from 'zod';
import { MemKind, MemKindValues } from '@memento-ai/types/src/memKind';
import { RequiredMetaBase } from '@memento-ai/types';

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

export type PartialSimilarityIndex = Partial<SimilarityIndex>;

function makeEmptySimilarityIndex(): SimilarityIndex {
    const index: PartialSimilarityIndex = {};
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
            case 'doc': {
                const { summaryid } = similarity;
                if (!!summaryid) { index['dsum'].add(summaryid); }
                break;
            }
            case 'dsum': {
                const { docid } = similarity;
                if (!!docid) { index['doc'].add(docid); }
                break;
            }
            case 'conv': {
                const { docid } = similarity;
                if (!!docid) { index['xchg'].add(docid); }
                break;
            }
            case 'syn': {
                const { docid } = similarity;
                if (!!docid) { index['xchg'].add(docid); }
                break;
            }
            case 'xchg': {
                const { summaryid } = similarity;
                if (!!summaryid) { index['syn'].add(summaryid); }
                break;
            }
        }
    }
    return index;
}


const PartialMemento = RequiredMetaBase.pick({
    id: true,
    tokens: true,
    content: true,
    source: true,
    kind: true,
})
.extend({
    content: z.string(),
    tokens: z.number(),
})
;
type PartialMemento = z.TypeOf<typeof PartialMemento>;

export async function loadMementoSet(dbPool: DatabasePool, idSet: Set<string>): Promise<PartialMemento[]> {
    const idArray: string[] = Array.from(idSet);
    const result = await dbPool.connect(async (conn) => {
        const query = sql.type(PartialMemento)`
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
    return result.rows.map((row: PartialMemento) => row);
}

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
