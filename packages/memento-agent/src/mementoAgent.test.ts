// Path: packages/memento-agent/src/mementoAgent.test.ts

import { expect, it, describe, beforeEach, afterEach, beforeAll, afterAll} from "bun:test";
import { createConversation, type ConversationInterface, type Provider } from "@memento-ai/conversation";
import { createMementoDb, dropDatabase, getDatabaseSchema } from "@memento-ai/postgres-db";
import { functionCallingInstructions, additionalContext } from "./dynamicPrompt";
import { getProjectRoot, stripCommonIndent } from "@memento-ai/utils";
import { ingestDirectory } from "@memento-ai/ingester";
import { MementoAgent, type MementoAgentArgs } from "./mementoAgent";
import { MementoDb } from "@memento-ai/memento-db";
import { nanoid } from "nanoid";
import { AssistantMessage, type Message } from "@memento-ai/types";
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
    }, timeout);
});

describe('Can create the initial message for extra context', () => {
    let db: MementoDb;
    let dbname: string;
    beforeAll(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname, interceptors);
        db = await MementoDb.create(dbname, interceptors);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
    });

    afterAll(async () => {
        await db.close();
        await dropDatabase(dbname);
    });

    it('creates additionalContext', async () => {
        await ingestDirectory({db, dirPath: `${getProjectRoot()}/packages/encoding`});
        const result = await db.searchMemsBySimilarity(stripCommonIndent(`
            import { get_encoding } from "tiktoken";

            const enc = get_encoding("cl100k_base");
        `), 2000);
        const message = additionalContext([], [], result);

        // Some static text that should appear:
        expect(message).toInclude("The following is additional context selected from the database that might be useful");

        // The similarity search is crafted such that it should return as the best hit this source file.
        // But note that it is a long enough file (~1200 tokens) that the test might be flaky.
        expect(result[0].source).toInclude('packages/encoding/src/encoding.ts');
    }, timeout);
});
