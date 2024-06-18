// Path: packages/resolution-agent/src/resolutionAgent.test.ts

import { createConversation } from '@memento-ai/conversation'
import { MementoDb } from '@memento-ai/memento-db'
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import debug from 'debug'
import { nanoid } from 'nanoid'
import { type Interceptor } from 'slonik'
import { ResolutionAgent } from './resolutionAgent'

const dlog = debug('resolutionAgent:test')

const interceptors: Interceptor[] = [
    {
        queryExecutionError: async (e, query) => {
            dlog({ e, query })
            return null
        },
    },
]

describe('ResolutionAgent', () => {
    let db: MementoDb
    let dbname: string
    let resolutionAgent: ResolutionAgent
    beforeEach(async () => {
        dbname = `test_${nanoid()}`
        await createMementoDb(dbname, interceptors)
        db = await MementoDb.connect(dbname)
        expect(db).toBeTruthy()
        expect(db.name).toBe(dbname)
        expect(db.pool).toBeTruthy()

        const conversation = createConversation('anthropic', {
            model: 'haiku',
            temperature: 0.0,
            max_response_tokens: 70,
            logging: { name: 'resolution' },
        })
        resolutionAgent = new ResolutionAgent({ db, conversation })
    })

    afterEach(async () => {
        try {
            await db.close() // this will close the DB
            await dropDatabase(dbname)
        } catch (e) {
            const err = e as Error
            dlog(err.message)
            dlog(err.stack)
        }
    })

    // TODO
    it.todo('placeholder', () => {
        expect(resolutionAgent).toBeTruthy()
    })
})
