// Path: packages/synopsis-agent/src/synopsisAgent.test.ts

import { createConversation, defaultProviderAndModel, type ConversationInterface } from '@memento-ai/conversation'
import { MementoDb } from '@memento-ai/memento-db'
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { nanoid } from 'nanoid'
import { SynopsisAgent } from './synopsisAgent'

describe('SynopsisAgent', () => {
    let db: MementoDb
    let dbname: string

    beforeEach(async () => {
        dbname = `test_${nanoid()}`
        await createMementoDb(dbname)
        db = await MementoDb.connect(dbname)
    })

    afterEach(async () => {
        await db.close()
        await dropDatabase(dbname)
    })

    it('generates a synopsis for the latest conversational exchange', async () => {
        await db.addConversationMem({
            content: 'Hello, how are you?',
            role: 'user',
        })

        await db.addConversationMem({
            content: 'I am doing well, thank you for asking.',
            role: 'assistant',
        })

        const { provider, model } = defaultProviderAndModel
        const conversation: ConversationInterface = createConversation(provider, {
            model,
            temperature: 0.0,
            max_response_tokens: 70,
            logging: { name: 'synopsis' },
        })
        const synopsisAgent = new SynopsisAgent({ conversation, db })
        const synopsis = await synopsisAgent.run()

        expect(synopsis).toBeTruthy()
        expect(synopsis).toMatch(/\bWe\b/)
        expect(synopsis).toMatch(/\bgreeted\b/)
    })
})
