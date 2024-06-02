// Path: packages/memento-db/src/tests/scoreMemsBySimilarityUtil.ts

import { Command } from 'commander';
import { extractKeywordsFromMessage, selectMementosSimilarToContent } from '../extractKeywordsFromMessage';
import { loadMementoSet, makeSimilarityIndex, scoreMemsBySimilarity } from '../scoreMemsBySimilarity';
import { MementoDb } from '../mementoDb';
import { MemKindValues } from '@memento-ai/types';
import c from 'ansi-colors';
import type { SimilarityIndex, SimilarityMap } from '../scoreMemsBySimilarity';

const program = new Command();

program
    .version('0.0.1')
    .description(`A utility to see how scoreMemsBySimilarity performs.`)
    .requiredOption('-d, --database <dbname>', 'The name of the database to use')
    .option('-t, --tokens <int>', 'The total number of tokens to select', '4000');

program.parse(process.argv);

async function main() {
    console.info('Running scoreMemsBySimilarity utility...');
    const options = program.opts();

    let { database, tokens } = options;
    tokens = parseInt(tokens);

    if (!database) {
        console.error('You must provide a database name');
        program.help();
    }

    const db: MementoDb = await MementoDb.create(database);

    let multiline = false;
    async function* collectLines() {
        let lines = [];
        const prompt = c.red("\nYou: ");
        process.stdout.write(prompt);
        for await (const line of console) {
            if (line.trim() === '!!') {
                multiline = !multiline;
                continue;
            }
            if (!multiline) {
                yield [line];
                process.stdout.write(prompt);
            }
            else if (line.trim() === '**') {
                yield lines;
                process.stdout.write(prompt);
                lines = [];
            } else {
                lines.push(line);
            }
        }
    }

    for await (const lines of collectLines()) {
        process.stdout.write(`${c.blue('Assistant: ')}`);
        const content: string = lines.join('\n')

        const keywords = await extractKeywordsFromMessage(db.pool, {content});
        console.table(keywords);

        const mementosSimilarToContent = await selectMementosSimilarToContent(db.pool, {content});
        console.table(mementosSimilarToContent.map(m => {
            return { ...m, content: m.content.split('\n')[0].slice(0, 60) };
        }));

        const result: SimilarityMap = await scoreMemsBySimilarity(db.pool, content, tokens);
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

        // const exchangeHistory = await loadMementoSet(db.pool, index[XCHG]);
        // exchangeHistory.forEach(xchg => {
        //     const { content } = xchg;
        //     console.log(content);
        //     console.log('\n-------------------\n\n');
        // });

        console.log(`Total tokens: ${totalTokens}`);
    }

}

main().catch(console.error);
