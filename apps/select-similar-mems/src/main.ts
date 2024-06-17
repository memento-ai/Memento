// Path: apps/select-similar-mems/src/main.ts

import { Command } from 'commander';
import { MementoDb } from '@memento-ai/memento-db';
import c from 'ansi-colors';

import {
    extractKeywordsFromContent,
    selectMemsByKeywordSearch,
    selectMemsBySemanticSimilarity,
    selectSimilarMementos
} from '@memento-ai/search';

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

    const { database, tokens, content } = options;
    const maxTokens = parseInt(tokens);

    if (!database) {
        console.error('You must provide a database name');
        program.help();
    }

    const db: MementoDb = await MementoDb.connect(database);

    const keywords = await extractKeywordsFromContent(db.pool, {content});
    console.info(c.bold('Keywords:'));
    console.table(keywords);

    const keywordSearchMems = await selectMemsByKeywordSearch(db.pool, {content, maxTokens});

    console.info(c.bold('Keyword similar mementos:'));
    console.table(keywordSearchMems.map(m => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { created_at, ...rest} = {...m, content: m.content.split('\n')[0].slice(0, 60) };
        return rest;
    }));

    const semanticSearchMems = await selectMemsBySemanticSimilarity(db.pool, { content, maxTokens });

    console.info(c.bold('Semantically similar mementos:'));
    console.table(semanticSearchMems.map(m => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { created_at, ...rest} = {...m, content: m.content.split('\n')[0].slice(0, 60) };
        return rest;
    }));

    const fullSearchMems = await selectSimilarMementos(db.pool, { content, maxTokens });

    console.info(c.bold('Full search similar mementos:'));
    console.table(Object.values(fullSearchMems).map(m => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { created_at, ...rest} = {...m, content: m.content.split('\n')[0].slice(0, 60) };
        return rest;
    }));
}

main().catch(console.error);
