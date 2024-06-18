// Path: packages/function-calling/src/functions/addSynopsis.test.ts

import { MementoDb } from '@memento-ai/memento-db'
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db'
import { SYN } from '@memento-ai/types'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import debug from 'debug'
import { nanoid } from 'nanoid'
import { sql } from 'slonik'
import { registry } from './index'

const dlog = debug('addSynopsis')

describe('addSynopsis', () => {
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
    })

    afterEach(async () => {
        dlog(`Dropping database ${dbname}`)
        await db.close()
        await dropDatabase(dbname)
    })

    it('can add a new synopsis', async () => {
        const addSynopsis = registry['addSynopsis']
        expect(addSynopsis).toBeDefined()
        dlog(`Executing addSynopsis on ${dbname}`)
        await addSynopsis.fn({
            context: { pool: db.pool },
            content: 'test synopsis',
        })
        let result: string[] = []
        await db.pool.connect(async (conn) => {
            const synopsis = await conn.query(sql.unsafe`
            SELECT content
            FROM memento
            WHERE kind = ${SYN}`)
            result = synopsis.rows.map((row) => row.content as string)
        })
        expect(typeof result).toBe('object')
        expect(result.length).toBe(1)
        expect(result[0]).toInclude('test synopsis')
    })
})
