// Path: packages/search/src/tests/selectSimilarMemsUtil.ts

import { Command } from 'commander';
import { extractKeywordsFromContent } from '../extractKeywordsFromContent';
import { MementoDb } from '@memento-ai/memento-db';
import { selectMemsByKeywordSearch } from '../selectMemsByKeywordSearch';
import { selectMemsBySemanticSimilarity } from '../selectMemsBySemanticSimilarity';
import c from 'ansi-colors';
import { selectSimilarMementos } from '../selectSimilarMementos';

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
    console.info(c.bold('Keywords:'));
    console.table(keywords);

    const keywordSearchMems = await selectMemsByKeywordSearch(db.pool, {content, maxTokens: tokens});

    console.info(c.bold('Keyword similar mementos:'));
    console.table(keywordSearchMems.map(m => {
        const { created_at, ...rest} = {...m, content: m.content.split('\n')[0].slice(0, 60) };
        return rest;
    }));

    const semanticSearchMems = await selectMemsBySemanticSimilarity(db.pool, { content, maxTokens: tokens });

    console.info(c.bold('Semantically similar mementos:'));
    console.table(semanticSearchMems.map(m => {
        const { created_at, ...rest} = {...m, content: m.content.split('\n')[0].slice(0, 60) };
        return rest;
    }));

    const fullSearchMems = await selectSimilarMementos(db.pool, { content, maxTokens: tokens });

    console.info(c.bold('Full search similar mementos:'));
    console.table(fullSearchMems.map(m => {
        const { created_at, ...rest} = {...m, content: m.content.split('\n')[0].slice(0, 60) };
        return rest;
    }));
}

main().catch(console.error);
