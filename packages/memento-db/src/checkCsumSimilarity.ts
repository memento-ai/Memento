// Path: packages/memento-db/src/checkCsumSimilarity.ts

import { MyEmbeddingFunction } from '@memento-ai/embedding';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import debug from 'debug';

const dlog = debug("checkCsumSimilarity");

export const CsumDistanceResult = z.object({
    id: z.string(),
    content: z.string(),
    distance: z.number().min(0).max(1).describe('The cosine distance between the two CSUMs'),
});
export type CsumDistanceResult = z.TypeOf<typeof CsumDistanceResult>;

export const CsumSimilarity = CsumDistanceResult.extend({
    similarity: z.number().min(0).max(1).describe('The longest common substring fraction between the two CSUMs'),
});
export type CsumSimilarity = z.TypeOf<typeof CsumSimilarity>;

function longestCommonSubstring(str1: string, str2: string): string {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
        .fill(null)
        .map(() => Array(n + 1).fill(0));
    let maxLength = 0;
    let endPos = 0;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                if (dp[i][j] > maxLength) {
                    maxLength = dp[i][j];
                    endPos = i;
                }
            } else {
                dp[i][j] = 0;
            }
        }
    }

    const startPos = endPos - maxLength;
    return str1.slice(startPos, endPos);
}

export function similarityRatio(str1: string, str2: string): number {
    const lcs = longestCommonSubstring(str1, str2);
    const minLength = Math.min(str1.length, str2.length);
    return lcs.length / minLength;
}

export type CheckCsumSimilarityOptions = {
    distanceThreshold: number;
    similarityThreshold: number;
};

export const defaultCheckCsumSimilarityOptions: CheckCsumSimilarityOptions = {
    distanceThreshold: 0.2,
    similarityThreshold: 0.4,
};

async function checkCsumSimilarityImpl(pool: DatabasePool, newCsumContent: string
    , options: CheckCsumSimilarityOptions): Promise<CsumSimilarity[]>
{
    // Compute the embedding vector for the new CSUM content
    const embedding = new MyEmbeddingFunction();
    const newCsumEmbedding = await embedding.generateOne(newCsumContent);

    // Convert the embedding to a PostgreSQL-compatible vector format
    const newCsumVector = `[${newCsumEmbedding.join(',')}]`;

    // Query the database to find similar CSUMs
    let csumDistances: CsumDistanceResult[] = [];
    await pool.connect(async conn => {
        const query = sql.type(CsumDistanceResult)`
            SELECT
                meta.id as id,
                mem.content as content,
                mem.embed_vector <=> ${newCsumVector} AS distance
            FROM meta
            JOIN mem ON meta.memid = mem.id
            WHERE
                meta.kind = 'csum'
            ORDER BY distance ASC`;
        dlog('Querying:', query)
        const result = await conn.query(query);
        csumDistances = result.rows.map(row => row);
        dlog('Got result from query:', csumDistances)
    });

    let csumSimilarities: CsumSimilarity[] = csumDistances.map(csum => {
        const similarity = similarityRatio(newCsumContent, csum.content);
        return { ...csum, similarity };
    });

    // Filter out CSUMs that are too dissimilar
    csumSimilarities = csumSimilarities.filter(csum => csum.distance <= options.distanceThreshold && csum.similarity >= options.similarityThreshold)
        .sort((a, b) => a.similarity - b.similarity);

    // Return the similarity results
    return csumSimilarities;
}

export async function checkCsumSimilarity(pool: DatabasePool, newCsumContent: string
        , options: CheckCsumSimilarityOptions = defaultCheckCsumSimilarityOptions): Promise<CsumSimilarity[]> {
    try {
        return await checkCsumSimilarityImpl(pool, newCsumContent, options);
    } catch (error) {
        console.error('Error in checkCsumSimilarity:', error);
        return [];
    }
}
