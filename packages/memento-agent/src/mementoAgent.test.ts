// Path: packages/memento-agent/src/mementoAgent.test.ts

import { expect, it, describe, beforeEach, afterEach} from "bun:test";
import { createConversation, type ConversationInterface, type Provider } from "@memento-ai/conversation";
import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import { getProjectRoot } from "@memento-ai/utils";
import { ingestDirectory } from "@memento-ai/ingester";
import { MementoAgent, type MementoAgentArgs } from "./mementoAgent";
import { MementoDb } from "@memento-ai/memento-db";
import { nanoid } from "nanoid";
import { AssistantMessage } from "@memento-ai/types";
import { type SendArgs } from "@memento-ai/agent";
import { type Interceptor } from "slonik";
import debug from "debug";

const dlog = debug("mementoAgent:test");

function sendArgs(content: string): SendArgs {
    return {
        content
    };
}

const timeout = 60000;

const provider: Provider = 'anthropic';
const model: string = 'haiku';

const interceptors: Interceptor[] = [{queryExecutionError: async (e, query) => { dlog({e, query}); return null; }}];

describe("MementoAgent", () => {

    let db: MementoDb;
    let dbname: string;
    let conversation: ConversationInterface;
    let mementoAgent: MementoAgent;
    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname, interceptors);
        db = await MementoDb.create(dbname, interceptors);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
        conversation = createConversation(provider, {model, temperature: 0.0});

        const mementoChatArgs: MementoAgentArgs = {
            conversation,
            db,
        };

        mementoAgent = new MementoAgent(mementoChatArgs);
    });

    afterEach(async () => {
        try {
            await mementoAgent.close(); // this will close the DB
            await dropDatabase(dbname);
        }
        catch (e) {
            const err = e as Error;
            dlog(err.message);
            dlog(err.stack);
        }
    });

    it("can chat with the agent", async () => {
        const message: AssistantMessage = await mementoAgent.run(sendArgs("0. What did Leonard Shelby suffer from?"));
        expect(message.content).toBeTruthy();
    }, timeout);

    it("can chat with the agent and get a response", async () => {
        let message: AssistantMessage = await mementoAgent.run(sendArgs("1. What did Leonard Shelby suffer from?"));
        expect(message.content).toBeTruthy();
        message = await mementoAgent.run(sendArgs("2. What is anterograde amnesia?"));
        expect(message.content).toBeTruthy();
        message = await mementoAgent.run(sendArgs("3. What is 2 + 2?"));
        expect(message.content).toBeTruthy();
    }, timeout);

    it("can chat with the agent about ingested content", async () => {
        await ingestDirectory({db, dirPath: `${getProjectRoot()}/packages/types`});
        let args = sendArgs("What are the various kinds of MemMetaData?");
        let message: AssistantMessage = await mementoAgent.run(args);
        expect(message.content).toBeTruthy();

        // geneatePrompt() is normally called from run(). We can call it directly here because run() has been called.
        const prompt = await mementoAgent.generatePrompt();
        expect(prompt).toInclude("The Memento system automatically retieves information it believes may be relevant to the current conversation.");
        expect(prompt).toInclude('packages/types/src/metaSchema.ts');
    }, timeout);
});
