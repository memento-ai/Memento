// Path: packages/memento-db/src/tests/get_last_user_message.test.ts

import { createMementoDb, dropDatabase } from "@memento-ai/postgres-db";
import { expect, it, describe, beforeEach, afterEach} from "bun:test";
import { nanoid } from "nanoid";
import { MementoDb } from "../mementoDb";
import { USER, ASSISTANT } from "@memento-ai/types";

describe("get last user or assistant message", () => {

    let dbname: string;
    let db: MementoDb;
    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        db = await MementoDb.connect(dbname);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();

        await db.addConversationMem({ role: USER, content: "message1" });
        await db.addConversationMem({ role: ASSISTANT, content: "response1" });
        // await db.addConversationMem({ role: USER, content: "message2" });
        // await db.addConversationMem({ role: ASSISTANT, content: "```function\n```" });
        // await db.addConversationMem({ role: USER, content: "'''result\n" });
        // await db.addConversationMem({ role: ASSISTANT, content: "response2" });
        // await db.addConversationMem({ role: USER, content: "messageN" });
        // await db.addConversationMem({ role: ASSISTANT, content: "responseN" });
    });

    afterEach(async () => {
        expect(db).toBeTruthy();
        await db.close();
        await dropDatabase(dbname);
    });

    it("beforeEach and afterEach", async () => {
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();
    });

    it("can get last user and last assistant messages, happy path one message each", async () => {
        const lastUserMessage = await db.get_last_user_message();
        expect(lastUserMessage.content).toBe("message1");
        const lastAssistantMessage = await db.get_last_assistant_message();
        expect(lastAssistantMessage.content).toBe("response1");
    });

    it("can get last user and last assistant messages, special case for function calls", async () => {
        await db.addConversationMem({ role: USER, content: "message2" });
        await db.addConversationMem({ role: ASSISTANT, content: "```function\n```" });
        await db.addConversationMem({ role: USER, content: "'''result\n" });
        await db.addConversationMem({ role: ASSISTANT, content: "response2" });
        const lastUserMessage = await db.get_last_user_message();
        expect(lastUserMessage.content).toBe("message2");
        const lastAssistantMessage = await db.get_last_assistant_message();
        expect(lastAssistantMessage.content).toBe("response2");
    });

    it("can get last user and last assistant messages, happy path normal exchange at end", async () => {
        await db.addConversationMem({ role: USER, content: "message2" });
        await db.addConversationMem({ role: ASSISTANT, content: "```function\n```" });
        await db.addConversationMem({ role: USER, content: "'''result\n" });
        await db.addConversationMem({ role: ASSISTANT, content: "response2" });
        await db.addConversationMem({ role: USER, content: "messageN" });
        await db.addConversationMem({ role: ASSISTANT, content: "responseN" });
        const lastUserMessage = await db.get_last_user_message();
        expect(lastUserMessage.content).toBe("messageN");
        const lastAssistantMessage = await db.get_last_assistant_message();
        expect(lastAssistantMessage.content).toBe("responseN");
    });
});
