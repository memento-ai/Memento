// Path: packages/synopsis-agent/src/synopsisAgent.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MementoDb } from '@memento-ai/memento-db';
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db';
import { nanoid } from 'nanoid';
import { SynopsisAgent } from './synopsisAgent';
import { createConversation, type ConversationInterface } from '@memento-ai/conversation';

describe('SynopsisAgent', () => {
    let db: MementoDb;
    let dbname: string;
    let conversation: ConversationInterface;

    beforeEach(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        db = await MementoDb.create(dbname);
        const provider = 'anthropic';
        const model = 'haiku';
        conversation = createConversation(provider, { model, temperature: 0.0 })
    });

    afterEach(async () => {
        await db.close();
        await dropDatabase(dbname);
    });

    it('generates a synopsis for the latest conversational exchange', async () => {
        // Arrange
        await db.addConversationMem({
            content: 'Hello, how are you?',
            role: 'user',
        });

        await db.addConversationMem({
            content: 'I am doing well, thank you for asking.',
            role: 'assistant',
        });

        const synopsisAgent = new SynopsisAgent({ db, conversation });

        // Act
        const synopsis = await synopsisAgent.run();

        // Assert
        expect(synopsis).toBeTruthy();
        expect(synopsis).toMatch(/\bI\b/);
    });
});
