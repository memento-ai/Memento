import { expect, it, describe, beforeEach, afterEach, beforeAll, afterAll} from "bun:test";
import { MementoDb } from "@memento-ai/memento-db";

import { createChatSession, type ChatSession } from "@memento-ai/chat";
import { type Message } from "@memento-ai/types";
import { MementoChat, NewMessageToAssistantArgs, firstAssistantMessageContent, firstUserMessageContent } from "./mementoChat";
import { nanoid } from "nanoid";
import { createMementoDb, dropDatabase, getDatabaseSchema } from "@memento-ai/postgres-db";
import { ingestDirectory } from "@memento-ai/ingester";
import { getProjectRoot } from "@memento-ai/utils";

function newMessageToAssistant(content: string): NewMessageToAssistantArgs {
    return {
        content,
        tokenLimit: 500,
        retrieveLimit: 5,
    };
}

const timeout = 60000;

describe("MementoChat", () => {

    let db: MementoDb;
    let dbname: string;
    let chatSession: ChatSession;
    let mementoChat: MementoChat;
    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        db = await MementoDb.create(dbname);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
        chatSession = createChatSession({});
        mementoChat = new MementoChat(chatSession, db);
    });

    afterEach(async () => {
        await db.close();
        await dropDatabase(dbname);
    });

    it("can chat with the agent", async () => {
        const args = newMessageToAssistant("0. What did Leonard Shelby suffer from?");
        const message: Message = await mementoChat.newMessageToAssistant(args);
        expect(message.content).toBeTruthy();
    }, timeout);

    it("can chat with the agent and get a response", async () => {
        let args = newMessageToAssistant("1. What did Leonard Shelby suffer from?");
        let message: Message = await mementoChat.newMessageToAssistant(args);
        expect(message.content).toBeTruthy();
        args = newMessageToAssistant("2. What is anterograde amnesia?");
        message = await mementoChat.newMessageToAssistant(args);
        expect(message.content).toBeTruthy();
        args = newMessageToAssistant("3. What is 2 + 2?");
        message = await mementoChat.newMessageToAssistant(args);
        expect(message.content).toBeTruthy();
    }, timeout);

    it("can chat with the agent about ingested content", async () => {
        await ingestDirectory(db, `${getProjectRoot()}/packages`);;
        let args = newMessageToAssistant("What are the various kinds of MemMetaData?");
        let message: Message = await mementoChat.newMessageToAssistant(args);
        expect(message.content).toBeTruthy();
    }, timeout);
});

describe('Can create the initial message for extra context', () => {
    let db: MementoDb;
    let dbname: string;
    beforeAll(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        db = await MementoDb.create(dbname);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
    });

    afterAll(async () => {
        await db.close();
        await dropDatabase(dbname);
    });

    it('creates firstUserMessageContent', async () => {
        const message = firstUserMessageContent(getDatabaseSchema(), "INTENTIONALLY OMITTED");
        expect(message).toInclude("Function: executeReadOnlyQuery");
        expect(message).toInclude("To invoke a function output a code-fenced JSON object.");
        expect(message).toInclude("CREATE TABLE mem(");
        expect(message).toInclude("CREATE TABLE meta(");
        expect(message).toInclude("CREATE OR REPLACE VIEW memento AS");
        expect(message).toInclude("INTENTIONALLY OMITTED");
    });

    it('creates firstAssistantMessageContent', async () => {
        await ingestDirectory(db, `${getProjectRoot()}/packages`);
        const result = await db.searchMemsBySimilarity(`MemMetaData is a zod discriminatedUnion of the this types:
    ConversationMetaData,
    ConvSummaryMetaData,
    DocSummaryMetaData,
    DocumentMetaData,
    FragmentMetaData,
    SystemMetaData,
            `.trim(), 3);
        const message = firstAssistantMessageContent(result);

        // Some static strings that must appear:
        expect(message).toInclude("The following context from the knowledge base MAY be useful in formulating the response.");
        expect(message).toInclude("All of the information provided so far is to guide you responses in a helpful direction.");

        // The similarity search is crafted such that it should return as the best hit this source file.
        // But note that it is a long enough file (~1200 tokens) that the test might be flaky.
        expect(result[0].source).toInclude('Memento/packages/types/src/mementoSchema.ts');
    });
});
