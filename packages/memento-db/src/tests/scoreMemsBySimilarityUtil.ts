// Path: packages/memento-db/src/tests/scoreMemsBySimilarityUtil.ts

import { Command } from 'commander';
import debug from 'debug';
import { AddPackageReadmeAgent, AddProjectReadmeAgent, type AddPackageReadmeAgentArgs } from '@memento-ai/readme-agents';
import { readdir } from 'node:fs/promises';
import { getProjectRoot } from '@memento-ai/utils';
import { scoreMemsBySimilarity, type SimilarityMap } from '../scoreMemsBySimilarity';
import { ProviderNames, isProvider } from '@memento-ai/conversation';
import { MementoDb } from '../mementoDb';
import c from 'ansi-colors';

const dlog = debug("update-readmes");

const program = new Command();

program
    .version('0.0.1')
    .description(`A utility to see how scoreMemsBySimilarity performs.`)
    .option('-p, --provider <provider>', 'The provider to use [anthropic, ollama, openai, ...]')
    .option('-m, --model <model>', 'The model to use for summarization')
    .option('-d, --database <dbname>', 'The name of the database to use');

program.parse(process.argv);

async function main() {
    console.info('Running scoreMemsBySimilarity utility...');
    const options = program.opts();

    const { provider, model, database } = options;

    if (!provider) {
        console.error(`You must specify an LLM provider (${ProviderNames.join(', ')}`);
        program.help();
    }

    if (!isProvider(provider)) {
        console.error(`The provider ${provider} is not a known provider`);
        process.exit(1);
    }

    if (!model) {
        console.error('You must specify a model supported by the provider');
        program.help();
    }

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
        const result: SimilarityMap = await scoreMemsBySimilarity(db.pool, content, 4000);

        for (const key in result) {
            console.log(key, result[key]);
        }
    }

}

main().catch(console.error);
