// Path: packages/memento-db/src/utils/computeCsumSimilarities.ts

import { Command } from 'commander';
import { createPool, type DatabasePool, sql } from 'slonik';
import { z } from 'zod';
import { similarityRatio } from '../checkCsumSimilarity';

// This utility application looks at all pairs of csums.
// This is never needed in the Memento app.
// But the Memento app (specifically the ContinuityAgent) will look at
// the distance between a new csum and all existing csums,
// so there may be some overlap in the code.

export const CsumPairDistance = z.object({
    id1: z.string(),
    id2: z.string(),
    len1: z.number(),
    len2: z.number(),
    distance: z.number().describe('The cosine distance between the two CSUMs'),
});
export type CsumPairDistance = z.infer<typeof CsumPairDistance>;

export const CsumPairDistanceWithSimilarity = CsumPairDistance.extend({
    similarity: z.number().describe('The longest common substring fraction between the two CSUMs'),
});
export type CsumPairDistanceWithSimilarity = z.infer<typeof CsumPairDistanceWithSimilarity>;

// We load all Csum distances only from this utility script, so we don't need to export the function.
// In the Memento app, we only compare new Csums to existing ones, which requires a less expensive query.
async function loadAllCsumDistances(pool: DatabasePool): Promise<CsumPairDistance[]> {
    const query = sql.type(CsumPairDistance)`
        WITH csum_mem AS (
        SELECT
            meta.id,
            mem.embed_vector,
            LENGTH(mem.content) AS len
        FROM meta
        JOIN mem ON meta.memid = mem.id
        WHERE meta.kind = 'csum'
        )
        SELECT
        c1.id AS id1,
        c2.id AS id2,
        c1.len AS len1,
        c2.len AS len2,
        c1.embed_vector <=> c2.embed_vector AS distance
        FROM csum_mem c1
        JOIN csum_mem c2 ON c1.id < c2.id
        ORDER BY distance ASC
    `;

  return pool.connect(async (connection) => {
    const result = await connection.query(query);
    return result.rows.map((row) => row);
  });
}

const Content = z.object({
    content: z.string()
});
type Content = z.infer<typeof Content>

function idQuality(id: string): number {
    // A simple heuristic to score an id based on its length and whether it uses the `memento-` prefix.
    // We consider the `memento-` prefix to contribute minimal information, so we prefer ids without it.
    // We therefore remove the `memento-` prefix and score the id based on its length.
    const idWithoutPrefix = id.replace('memento-', '');
    return idWithoutPrefix.length / 21;
}

async function main() {
    const program = new Command();

    program
        .version('0.0.1')
        .description('A utility to compute CSUM similarities and eliminate duplicates')
        .option('-d, --database <dbname>', 'The name of the database to use')
        .option('-D, --deduplicate', 'Remove duplicate CSUMs from the database');

    program.parse(process.argv);
    const options = program.opts();
    const { database: dbname, deduplicate } = options;

    if (!dbname) {
        console.error('Please provide a database name as a command-line argument.');
        process.exit(1);
    }

    const pool = await createPool(`postgresql://localhost/${dbname}`);

    try {
        const similarities = await loadAllCsumDistances(pool);

        if (deduplicate) {
            const duplicates = similarities.filter((distance) => distance.distance === 0);
            if (duplicates.length === 0) {
                console.log('No duplicates found.');
                return;
            }

            console.log('Removing duplicates:');

            for (const duplicate of duplicates) {
                const { id1, id2 } = duplicate;
                const score1 = idQuality(id1);
                const score2 = idQuality(id2);
                let idToDelete: string;
                if (score1 >= score2) {
                    console.log(`id1: ${id1} is preferred over id2: ${id2}`);
                    idToDelete = id2;
                } else {
                    console.log(`id2: ${id2} is preferred over id1: ${id1}`);
                    idToDelete = id1;
                }
                await pool.query(sql.unsafe`
                    DELETE FROM meta
                    WHERE id = ${idToDelete}
                `);
            }
        } else {

            // keep only the most similar pairs. Use distance < 0.2 as a threshold
            const mostSimilar = similarities.filter((distance) => distance.distance < 0.3);
            console.log('Most similar CSUM pairs:');
            console.table(mostSimilar);

            const remove = new Set<string>();
            const keep = new Set<string>();

            // find the longest common substring between the most similar pairs
            const withSimRatio: CsumPairDistanceWithSimilarity[] = await Promise.all(mostSimilar.map(async (distance: CsumPairDistance) => {
                const { id1, id2 } = distance;
                const {content: mem1} = await pool.one(sql.type(Content)`
                    SELECT content FROM memento WHERE id = ${id1}
                `);
                const {content: mem2} = await pool.one(sql.type(Content)`
                    SELECT content FROM memento WHERE id = ${id2}
                `);
                const row = { ...distance, similarity: similarityRatio(mem1, mem2) };
                if (row.similarity === 1) {
                    let r: string;
                    let k: string;
                    if (mem1.length > mem2.length) {
                        r = id2;
                        k = id1;
                    } else {
                        r = id1;
                        k = id2;
                    }
                    // We need to make sure that if the same item is in multiple pairs, we don't choose to remove it
                    // in one pair and keep it in another.
                    if (!keep.has(r) && !remove.has(k)) {
                        keep.add(k);
                        remove.add(r);
                        console.info(`Keeping ${k} and removing ${r}`);
                        await pool.query(sql.unsafe`
                            DELETE FROM meta
                            WHERE id = ${r}
                        `);
                    }
                }
                return row;
            }));
            console.log('Most similar CSUM pairs with distance ratio:');
            console.table(withSimRatio);
        }
    } catch (error) {
        console.error('Error computing CSUM similarities:', error);
    } finally {
        await pool.end();
    }
}

await main();
