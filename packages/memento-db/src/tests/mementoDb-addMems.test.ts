// Path: packages/memento-db/src/tests/mementoDb-addMems.test.ts

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { MementoDb } from '../mementoDb'

import { createMementoDb, dropDatabase, type ID } from '@memento-ai/postgres-db'
import { CONV, Memento, USER, XCHG } from '@memento-ai/types'
import { nanoid } from 'nanoid'
import { sql } from 'slonik'
import type { AddConvExchangeArgs } from '../mementoDb-types'

describe('MementoDb', () => {
    let db: MementoDb
    let dbname: string
    beforeEach(async () => {
        dbname = `test_${nanoid()}`
        await createMementoDb(dbname)
        db = await MementoDb.connect(dbname)
        expect(db).toBeTruthy()
        expect(db.name).toBe(dbname)
        expect(db.pool).toBeTruthy()
    })

    afterEach(async () => {
        await db.close()
        await dropDatabase(dbname)
    })

    it('can add a conversation mem', async () => {
        const id = await db.addConversationMem({ content: 'test conversation mem', role: USER })
        expect(id).toBeTruthy()
    })

    it('can add a fragment mem', async () => {
        const id = await db.addFragmentMem({ content: 'test fragment mem', docid: 'testDoc' })
        expect(id).toBeTruthy()
    })

    it('can add a doc and summary mem pair', async () => {
        const result = await db.addDocAndSummary({
            content: 'test document mem',
            summary: 'test document summary mem',
            source: 'testSource',
        })
        expect(result).toBeTruthy()
    })

    it('can add a user/assistant exchange', async () => {
        const args: AddConvExchangeArgs = {
            userContent: 'test user exchange',
            asstContent: 'test assistant',
        }
        const id: ID = await db.addConvExchangeMementos(args)

        const mementos = await db.pool.connect(async (conn) => {
            return await conn.query(sql.type(Memento)`
                SELECT
                    id,
                    memid,
                    content,
                    kind,
                    role,
                    source,
                    docid,
                    summaryid,
                    created_at
                FROM memento`)
        })
        mementos.rows.forEach((row) => {
            if (row.kind === XCHG) {
                expect(row.id).toBe(id.id)
            } else if (row.kind === CONV) {
                expect(row.docid).toBe(id.id)
                if (row.role === USER) {
                    expect(row.content).toBe(args.userContent)
                } else {
                    expect(row.content).toBe(args.asstContent)
                }
            }
        })
    })
})
