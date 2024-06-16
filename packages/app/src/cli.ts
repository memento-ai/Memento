// Path: packages/app/src/cli.ts

import { cleanUpLastUserMem } from '@memento-ai/postgres-db';
import { Command } from 'commander';
import { createMementoSystem } from '@memento-ai/memento-agent'
import { loadAggregateConfig } from '@memento-ai/config';
import { type Writable } from 'node:stream';
import c from 'ansi-colors';
import type { Config } from '@memento-ai/config';

const program = new Command();

program
    .version('0.0.1')
    .description('A chatbot that persists the conversation')
    .argument('config', 'The path to the configuration file');

program.parse(process.argv);

const configPath = program.args[0];
const configData: Config = await loadAggregateConfig(configPath);

const outStream: Writable = process.stdout;

const system = await createMementoSystem(configData, outStream);

await cleanUpLastUserMem(system.db.pool);

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
    const args = {
        content: lines.join('\n')
    };
    await system.mementoAgent.run(args);
}
