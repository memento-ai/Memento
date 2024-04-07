import { Command } from 'commander';
import { MementoDb } from '@memento-ai/memento-db';
import { MementoChat, NewMessageToAssistantArgs } from '@memento-ai/memento-chat';
import { createChatSession, type ChatSessionArgs, type ChatSession, getModel } from "@memento-ai/chat";
import c from 'ansi-colors';
import { cleanUpLastUserMem, wipeDatabase } from '@memento-ai/postgres-db';

const program = new Command();

program
    .version('0.0.1')
    .description('A chatbot that persists the conversation')
    .option('-m, --model <model>', 'The name of the model to use')
    .option('-d, --database <dbname>', 'The name of the database to use')
    .option('-x, --clean-slate', 'Drop the named database and start over');

program.parse(process.argv);

const options = program.opts();

const model = getModel(options.model);

if (!options.database) {
    console.error('You must provide a database');
    program.help();
}

const args: ChatSessionArgs = {
    model,
    outStream: process.stdout
};

const dbname = options.database;

if (options.cleanSlate) {
    await wipeDatabase(dbname);
}

const db: MementoDb = await MementoDb.create(dbname);
const chatSession: ChatSession = createChatSession(args);
const mementoChat: MementoChat = new MementoChat(chatSession, db);

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
    const args = NewMessageToAssistantArgs.parse({
        content: lines.join('\n'),
        retrieveLimit: 10,
        tokenLimit: 1000
    });
    await mementoChat.newMessageToAssistant(args);
}
