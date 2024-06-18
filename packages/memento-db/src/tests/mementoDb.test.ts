// Path: packages/memento-db/src/tests/mementoDb.test.ts

import { loadDefaultConfig } from '@memento-ai/config'
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db'
import type { Message } from '@memento-ai/types'
import { ASSISTANT, USER } from '@memento-ai/types'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { nanoid } from 'nanoid'
import { MementoDb } from '../mementoDb'

describe('MementoCollection independent db required', () => {
    const timeout = 30000

    let dbname: string
    let db: MementoDb
    beforeEach(async () => {
        dbname = `test_${nanoid()}`
        await createMementoDb(dbname)
        db = await MementoDb.connect(dbname)
        expect(db).toBeTruthy()
        expect(db.name).toBe(dbname)
        expect(db.pool).toBeTruthy()
    })

    afterEach(async () => {
        expect(db).toBeTruthy()
        await db.close()
        await dropDatabase(dbname)
    })

    it(
        'can exercise beforeEach and afterEach',
        () => {
            expect(db).toBeTruthy()
            expect(db.name).toBe(dbname)
            expect(db.pool).toBeTruthy()
        },
        timeout
    )

    it(
        'can add several conversations and retrieve them',
        async () => {
            expect(db).toBeTruthy()
            expect(db.name).toBe(dbname)
            expect(db.pool).toBeTruthy()
            await db.addConversationMem({ content: 'testMem1', role: USER })
            await db.addConversationMem({ content: 'testMem2', role: ASSISTANT })
            await db.addConversationMem({ content: 'testMem3', role: USER })
            await db.addConversationMem({ content: 'testMem4', role: ASSISTANT })
            const config = loadDefaultConfig()
            expect(config).toBeTruthy()
            expect(config.conversation).toBeTruthy()
            expect(config.conversation.max_exchanges).toBeGreaterThanOrEqual(3)
            expect(config.conversation.max_tokens).toBeGreaterThanOrEqual(1000)
            console.log(config.conversation)
            const conversation: Message[] = await db.getConversation(config)
            expect(conversation.length).toBe(4)
        },
        timeout
    )
})
