// Path: packages/ingester/src/summarizeDocument.test.ts

import { MementoDb, type DocAndSummaryResult } from '@memento-ai/memento-db'
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db'
import { DOC, DSUM } from '@memento-ai/types'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import debug from 'debug'
import { nanoid } from 'nanoid'
import { sql } from 'slonik'
import { createMockSummarizer, summarizeAndStoreDocuments, type SummarizerAgent } from './summarizeDocument'

const dlog = debug('summarizeDocument:test')

describe('summarizeDocument', () => {
    let db: MementoDb
    let dbname: string
    let summarizer: SummarizerAgent
    beforeEach(async () => {
        dbname = `test_${nanoid()}`
        summarizer = createMockSummarizer()
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

    it('can summarize a document', async () => {
        const source = 'packages/memento-agent/src/mementoAgent.ts'
        const content = await Bun.file(source).text()

        const docAndSummaryResult: DocAndSummaryResult = await summarizeAndStoreDocuments({
            db,
            source,
            content,
            summarizer,
        })
        const { docid, summaryid } = docAndSummaryResult

        dlog(`Summarized document ${docid} with summary ${summaryid}`)

        const result = await db.pool.connect(async (conn) =>
            conn.query(sql.unsafe`
            SELECT meta.id, meta.kind, meta.docid, meta.summaryid,mem.tokens, LEFT(mem.content, 30)
            FROM meta
            LEFT JOIN mem
            ON meta.memId = mem.id
            WHERE meta.kind IN (${DOC}, ${DSUM})
            ORDER BY meta.kind`)
        )

        const { rows } = result

        expect(rows.length).toBe(2)
        expect(rows[0].kind).toBe(DOC)
        expect(rows[1].kind).toBe(DSUM)
        const [doc, dsum] = rows
        expect(doc).toBeTruthy()
        expect(dsum).toBeTruthy()
        expect(doc.summaryid).toBe(dsum.id)
        expect(dsum.docid).toBe(doc.id)
    })
})
