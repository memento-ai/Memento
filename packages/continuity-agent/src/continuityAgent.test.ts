// Path: packages/continuity-agent/src/continuityAgent.test.ts

import { expect, it, describe, beforeEach, afterEach } from "bun:test";
import { createConversation, type ConversationInterface, type Provider } from "@memento-ai/conversation";
import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import { getProjectRoot } from "@memento-ai/utils";
import { ingestDirectory } from "@memento-ai/ingester";
import { ContinuityAgent, type ContinuityAgentArgs } from "./continuityAgent";
import { MementoDb } from "@memento-ai/memento-db";
import { MementoAgent } from "@memento-ai/memento-agent";
import { nanoid } from "nanoid";
import { type Message } from "@memento-ai/types";
import { type AgentArgs, type SendArgs } from "@memento-ai/agent";
import { type Interceptor } from "slonik";
import debug from "debug";

const dlog = debug("continuityAgent:test");

function sendArgs(content: string): SendArgs {
    return {
        content
    };
}

const timeout = 60000;

const provider: Provider = 'anthropic';
const model: string = 'haiku';

const interceptors: Interceptor[] = [{queryExecutionError: async (e, query) => { dlog({e, query}); return null; }}];

describe("ContinuityAgent", () => {

    let db: MementoDb;
    let dbname: string;
    let conversation: ConversationInterface;
    let mementoAgent: MementoAgent;
    let continuityAgent: ContinuityAgent;
    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname, interceptors);
        db = await MementoDb.create(dbname, interceptors);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
        conversation = createConversation(provider, {model, temperature: 0.0, logging: { name: "test" }});

        const mementoChatArgs: AgentArgs = {
            conversation,
            db,
        };

        const continuityAgentArgs: ContinuityAgentArgs = {
            db,
            providerAndModel: {provider, model},
        };

        mementoAgent = new MementoAgent(mementoChatArgs);
        continuityAgent = new ContinuityAgent(continuityAgentArgs);
    });

    afterEach(async () => {
        try {
            await db.close(); // this will close the DB
            await dropDatabase(dbname);
        }
        catch (e) {
            const err = e as Error;
            dlog(err.message);
            dlog(err.stack);
        }
    });

    async function sendMementoAndContinuity(sendArgs: SendArgs): Promise<{memento: Message, continuity: Message}> {
        const memento: Message = await mementoAgent.send(sendArgs);
        expect(memento.content).toBeTruthy();
        const continuity: Message = await continuityAgent.analyze();
        expect(continuity.content).toBeTruthy();
        return { memento, continuity };
    }

        it("can chat with the agent", async () => {
        const args = sendArgs("0. What did Leonard Shelby suffer from?");
        const { memento, continuity } = await sendMementoAndContinuity(args);
        expect(memento.content).toBeTruthy();
        expect(continuity.content).toBeTruthy();
    }, timeout);

    it("can chat with the agent and get a response", async () => {
        let { memento, continuity } = await sendMementoAndContinuity(sendArgs("1. What did Leonard Shelby suffer from?"));
        expect(memento.content).toBeTruthy();
        expect(continuity.content).toBeTruthy();

        ({ memento, continuity } = await sendMementoAndContinuity(sendArgs("2. What is anterograde amnesia?")));
        expect(memento.content).toBeTruthy();
        expect(continuity.content).toBeTruthy();

        ({ memento, continuity } = await sendMementoAndContinuity(sendArgs("3. What is 2 + 2?")));
        expect(memento.content).toBeTruthy();
        expect(continuity.content).toBeTruthy();
    }, timeout);

    it("can chat with the agent about ingested content", async () => {
        await ingestDirectory(db, `${getProjectRoot()}/packages/types`);;
        let { memento, continuity } = await sendMementoAndContinuity(sendArgs("What are the various kinds of MemMetaData?"));
        expect(memento.content).toBeTruthy();
        expect(continuity.content).toBeTruthy();
        dlog(continuity.content);
    }, timeout);
});
