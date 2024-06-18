// Path: packages/function-calling/src/functions/queryMementoView.test.ts

import { MementoDb } from '@memento-ai/memento-db'
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db'
import { ASSISTANT, USER } from '@memento-ai/types'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import debug from 'debug'
import { nanoid } from 'nanoid'
import { registry } from './index'

const dlog = debug('queryMementoView')

describe('queryMementoView', () => {
    const timeout = 120000

    let db: MementoDb
    let dbname: string
    beforeEach(async () => {
        dbname = `test_${nanoid()}`
        await createMementoDb(dbname)
        dlog(`Created database ${dbname}`)

        db = await MementoDb.connect(dbname)
        expect(db).toBeTruthy()
        expect(db.name).toBe(dbname)
        expect(db.pool).toBeTruthy()

        const id = await db.addConversationMem({ content: 'test conversation mem', role: USER })
        expect(id).toBeTruthy()
        dlog(`Added conversation mem to ${dbname} with id ${Bun.inspect(id)}`)

        const id2 = await db.addConversationMem({ content: 'another test conversation mem', role: USER })
        expect(id2).toBeTruthy()
        dlog(`Added conversation mem to ${dbname} with id ${Bun.inspect(id2)}`)
    })

    afterEach(async () => {
        dlog(`Dropping database ${dbname}`)
        await db.close()
        await dropDatabase(dbname)
    })

    it(
        'should execute a read-only SQL query on the knowledge base',
        async () => {
            const queryMementoView = registry['queryMementoView']
            expect(queryMementoView).toBeDefined()
            dlog(`Executing read-only query on ${dbname}`)
            const result = await queryMementoView.fn({
                query: 'SELECT kind FROM memento',
                context: { readonlyPool: db.readonlyPool },
            })
            expect(typeof result).toBe('object')
            expect(result.length).toBe(2)
        },
        timeout
    )

    it(
        'should execute a read-only SQL query using DISTINCT on the knowledge base',
        async () => {
            const queryMementoView = registry['queryMementoView']
            expect(queryMementoView).toBeDefined()
            dlog(`Executing read-only query on ${dbname}`)
            const result = await queryMementoView.fn({
                query: 'SELECT distinct kind FROM memento',
                context: { readonlyPool: db.readonlyPool },
            })
            expect(typeof result).toBe('object')
            expect(result.length).toBe(1)
        },
        timeout
    )

    it(
        'should execute a read-only SQL query with multiple conditions',
        async () => {
            const queryMementoView = registry['queryMementoView']
            expect(queryMementoView).toBeDefined()
            dlog(`Executing read-only query on ${dbname}`)

            // Add some test data with different roles and priorities
            await db.addConversationMem({ content: 'test mem 1', role: USER, priority: 10 })
            await db.addConversationMem({ content: 'test mem 2', role: USER, priority: 20 })
            await db.addConversationMem({ content: 'test mem 3', role: ASSISTANT, priority: 10 })

            const query = `SELECT content FROM memento WHERE role = '${USER}' AND priority >= 10 AND priority <= 20 LIMIT 5`

            const result = await queryMementoView.fn({
                query,
                context: { readonlyPool: db.readonlyPool },
            })

            expect(typeof result).toBe('object')
            expect(result.length).toBe(2)
            expect(result).toContainEqual({ content: 'test mem 1' })
            expect(result).toContainEqual({ content: 'test mem 2' })
        },
        timeout
    )

    it(
        'should execute a read-only SQL query using ILIKE',
        async () => {
            const queryMementoView = registry['queryMementoView']
            expect(queryMementoView).toBeDefined()
            dlog(`Executing read-only query on ${dbname}`)

            // Add some test data with different roles and priorities
            await db.addConversationMem({ content: 'test mem apple', role: USER, priority: 10 })
            await db.addConversationMem({ content: 'test mem bananna', role: USER, priority: 20 })
            await db.addConversationMem({ content: 'test mem cherry', role: ASSISTANT, priority: 10 })

            const query = `SELECT content FROM memento WHERE content ILIKE '%apple%' LIMIT 5`

            const result = await queryMementoView.fn({
                query,
                context: { readonlyPool: db.readonlyPool },
            })

            expect(typeof result).toBe('object')
            expect(result.length).toBe(1)
            expect(result).toContainEqual({ content: 'test mem apple' })
        },
        timeout
    )

    it(
        'should execute a read-only SQL query using tssearch',
        async () => {
            const queryMementoView = registry['queryMementoView']
            expect(queryMementoView).toBeDefined()
            dlog(`Executing read-only query on ${dbname}`)

            // Add some test data with different roles and priorities
            await db.addConversationMem({ content: 'test mem apple', role: USER, priority: 10 })
            await db.addConversationMem({ content: 'test mem bananna', role: USER, priority: 20 })
            await db.addConversationMem({ content: 'test mem cherry', role: ASSISTANT, priority: 10 })

            const query = `SELECT content FROM memento WHERE tssearch @@ to_tsquery('apple | cherry') LIMIT 5`

            const result = await queryMementoView.fn({
                query,
                context: { readonlyPool: db.readonlyPool },
            })

            expect(typeof result).toBe('object')
            expect(result.length).toBe(2)
            expect(result).toContainEqual({ content: 'test mem apple' })
            expect(result).toContainEqual({ content: 'test mem cherry' })
        },
        timeout
    )
})
