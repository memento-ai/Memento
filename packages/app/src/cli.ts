// Path: packages/app/src/cli.ts

import { cleanUpLastUserMem, wipeDatabase } from '@memento-ai/postgres-db';
import { Command } from 'commander';
import { createConversation, type ConversationInterface, type ConversationOptions } from '@memento-ai/conversation';
import { MementoAgent, type MementoAgentArgs } from '@memento-ai/memento-agent';
import { SynopsisAgent } from '@memento-ai/synopsis-agent';
import { MementoDb } from '@memento-ai/memento-db';
import { type Writable } from 'node:stream';
import c from 'ansi-colors';
import debug from 'debug';
import { ResolutionAgent } from '@memento-ai/resolution-agent';

const program = new Command();

program
    .version('0.0.1')
    .description('A chatbot that persists the conversation')
    .option('-p, --provider <provider>', 'The provider to use [anthropic, ollama, openai')
    .option('-m, --model <model>', 'The name of the model to use')
    .option('-d, --database <dbname>', 'The name of the database to use')
    .option('-t, --tokens', 'Show token counts')
    .option('-x, --clean-slate', 'Drop the named database and start over');

program.parse(process.argv);

const options = program.opts();

const { provider, model, database, tokens } = options;

if (tokens) {
    debug.enable("usage:tokens");
}

if (!provider) {
    console.error('You must specify an LLM provider');
    program.help();
}

if (!model) {
    console.error('You must specify a model supported by the provider');
    program.help();
}

if (!database) {
    console.error('You must provide a database');
    program.help();
}

const outStream: Writable = process.stdout;

if (options.cleanSlate) {
    await wipeDatabase(database);
}

const mementoConversationOptions: ConversationOptions = {
    model,
    stream: process.stdout,
    logging: { name:'memento' }
}

const db: MementoDb = await MementoDb.create(database);

const conversation: ConversationInterface = createConversation(provider, mementoConversationOptions);

const resolutionAgent = new ResolutionAgent({ db, conversation: createConversation('anthropic', { model: 'haiku', temperature: 0.0, logging: {name: 'resolution'} }) });
const synopsisAgent = new SynopsisAgent({ db, conversation: createConversation('anthropic', { model: 'haiku', temperature: 0.0, logging: {name: 'synopsis'} }) });

const mementoChatArgs: MementoAgentArgs = {
    conversation,
    resolutionAgent,
    synopsisAgent,
    db,
    outStream,

    // There are several parameters with defaults that we might want to expose via the CLI here
  };

const mementoAgent: MementoAgent = new MementoAgent(mementoChatArgs);

await cleanUpLastUserMem(db.pool);

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
    await mementoAgent.run(args);
}
