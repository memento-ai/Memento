// Path: packages/resolution-agent/src/resolutionAgent.test.ts

import { expect, it, describe, beforeEach, afterEach } from "bun:test";
import { createConversation, type ConversationInterface, type Provider } from "@memento-ai/conversation";
import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import { getProjectRoot } from "@memento-ai/utils";
import { ingestDirectory } from "@memento-ai/ingester";
import { ResolutionAgent, type ResolutionAgentArgs } from "./resolutionAgent";
import { MementoDb } from "@memento-ai/memento-db";
import { MementoAgent } from "@memento-ai/memento-agent";
import { nanoid } from "nanoid";
import { type Message } from "@memento-ai/types";
import { type AgentArgs, type SendArgs } from "@memento-ai/agent";
import { type Interceptor } from "slonik";
import debug from "debug";

const dlog = debug("resolutionAgent:test");

function sendArgs(content: string): SendArgs {
    return {
        content
    };
}

const timeout = 60000;

const provider: Provider = 'anthropic';
const model: string = 'haiku';

const interceptors: Interceptor[] = [{queryExecutionError: async (e, query) => { dlog({e, query}); return null; }}];

describe("ResolutionAgent", () => {

    let db: MementoDb;
    let dbname: string;
    let conversation: ConversationInterface;
    let mementoAgent: MementoAgent;
    let resolutionAgent: ResolutionAgent;
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

        const resolutionAgentArgs: ResolutionAgentArgs = {
            db,
            conversation,
        };

        mementoAgent = new MementoAgent(mementoChatArgs);
        resolutionAgent = new ResolutionAgent(resolutionAgentArgs);
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

    // TODO

});
