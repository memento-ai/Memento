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
import { loadConfig, loadDefaultConfig } from '@memento-ai/config';
import type { Config } from '@memento-ai/config';
import type { AgentArgs } from '@memento-ai/agent';

const program = new Command();

program
    .version('0.0.1')
    .description('A chatbot that persists the conversation')
    .option('-c, --config <config>', 'The path to the configuration file')
    .option('-p, --provider <provider>', 'The provider to use [anthropic, ollama, openai')
    .option('-m, --model <model>', 'The name of the model to use')
    .option('-d, --database <dbname>', 'The name of the database to use')
    .option('-t, --tokens', 'Show token counts')
    .option('-x, --clean-slate', 'Drop the named database and start over');

program.parse(process.argv);

const options = program.opts();

const { config, provider, model, database, tokens } = options;

let configData: Config;
if (config) {
    configData = await loadConfig(config);
} else {
    configData = await loadDefaultConfig();
}

if (tokens) {
    debug.enable("usage:tokens");
}

if (provider) {
    configData.memento_agent.provider = provider;
}

if (model) {
    configData.memento_agent.model = model;
}

if (database) {
    configData.database = database;
}

const outStream: Writable = process.stdout;

if (options.cleanSlate) {
    await wipeDatabase(database);
}

const mementoConversationOptions: ConversationOptions = {
    model: configData.memento_agent.model,
    stream: process.stdout,
    logging: { name:'memento' }
}

const db: MementoDb = await MementoDb.create(database);

const conversation: ConversationInterface = createConversation(provider, mementoConversationOptions);

const resoConvOpts: ConversationOptions = {
    model: configData.resolution_agent.model,
    stream: undefined,
    logging: { name: 'resolution' },
    temperature: configData.resolution_agent.temperature
}

const resoAgentArgs: AgentArgs = {
    db,
    conversation: createConversation(config.resolution_agent.provider, resoConvOpts)
};
const resolutionAgent = new ResolutionAgent(resoAgentArgs);

const synConvOpts: ConversationOptions = {
    model: configData.synopsis_agent.model,
    stream: undefined,
    logging: { name: 'synopsis' },
    temperature: configData.synopsis_agent.temperature
}
const synAgentArgs: AgentArgs = {
    db,
    conversation: createConversation(config.synopsis_agent.provider, synConvOpts)
};
const synopsisAgent = new SynopsisAgent(synAgentArgs);

const mementoChatArgs: MementoAgentArgs = {
    conversation,
    resolutionAgent,
    synopsisAgent,
    db,
    outStream,
    max_message_pairs: configData.conversation.max_exchanges,
    max_response_tokens: configData.conversation.max_tokens,
    max_similarity_tokens: configData.search.max_tokens,
    max_synopses_tokens: configData.synopsis_agent.max_tokens,
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
