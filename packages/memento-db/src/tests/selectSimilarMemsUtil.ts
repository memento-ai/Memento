// Path: packages/memento-db/src/tests/selectSimilarMemsUtil.ts

import { Command } from 'commander';
import { extractKeywordsFromContent, selectMemsByKeywordSearch } from '../selectMemsByKeywordSearch';
import { loadMementoSet, makeSimilarityIndex, selectMemsBySemanticSimilarity } from '../selectMemsBySemanticSimilarity';
import { MementoDb } from '../mementoDb';
import { MemKindValues } from '@memento-ai/types';
import c from 'ansi-colors';
import type { SimilarityIndex, SimilarityMap } from '../selectMemsBySemanticSimilarity';

const program = new Command();

program
    .version('0.0.1')
    .description(`A utility to experiment with semantic and keyword similarity.`)
    .requiredOption('-d, --database <dbname>', 'The name of the database to use')
    .requiredOption('-c, --content <string>', 'The content to score')
    .option('-t, --tokens <int>', 'The total number of tokens to select', '10000');

program.parse(process.argv);

async function main() {
    console.info('Running selectMemsBySemanticSimilarity utility...');
    const options = program.opts();

    let { database, tokens, content } = options;
    tokens = parseInt(tokens);

    if (!database) {
        console.error('You must provide a database name');
        program.help();
    }

    const db: MementoDb = await MementoDb.create(database);

    const keywords = await extractKeywordsFromContent(db.pool, {content});
    console.table(keywords);

    const mementosSimilarToContent = await selectMemsByKeywordSearch(db.pool, {content, maxTokens: tokens});
    console.table(mementosSimilarToContent.map(m => {
        return { ...m, content: m.content.split('\n')[0].slice(0, 60) };
    }));

    const result: SimilarityMap = await selectMemsBySemanticSimilarity(db.pool, content, tokens);
    const semanticallySimilarMementos = Object.values(result).sort((a, b) => b.similarity - a.similarity);
    console.table(semanticallySimilarMementos.map(m => {
        const content = m.content.split('\n')[0].slice(0, 60);
        const { id, kind, similarity, source } = m;
        return { id, kind, similarity, source, content};
    }));

    const index: SimilarityIndex = makeSimilarityIndex(result);

    let totalTokens = 0;
    for (const kind of MemKindValues) {
        const mementos = await loadMementoSet(db.pool, index[kind]);
        if (mementos.length === 0) continue;
        const abbrev = mementos.map(m => {
            let { content, tokens } = m;
            totalTokens += tokens;
            content = content.split('\n')[0].slice(0, 60);
            return {...m, content};
        });
        console.table(abbrev);
    }

    console.log(`Total tokens: ${totalTokens}`);
}

main().catch(console.error);
