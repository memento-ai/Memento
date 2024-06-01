// Path: packages/memento-db/src/tests/scoreMemsBySimilarityUtil.ts

import { Command } from 'commander';
import debug from 'debug';
import { scoreMemsBySimilarity, type SimilarityMap } from '../scoreMemsBySimilarity';
import { MementoDb } from '../mementoDb';
import c from 'ansi-colors';

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
        const result: SimilarityMap = await scoreMemsBySimilarity(db.pool, content, tokens);

        for (const key in result) {
            console.log(key, result[key]);
        }
    }

}

main().catch(console.error);
