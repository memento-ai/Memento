// Path: packages/search/src/search.test.ts

import { ingestDirectory } from '@memento-ai/ingester'
import { MementoDb } from '@memento-ai/memento-db'
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db'
import { getMementoProjectRoot } from '@memento-ai/utils'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import debug from 'debug'
import { nanoid } from 'nanoid'
import { trimSearchResult } from '..'
import type { MementoSearchArgs, MementoSearchResult } from './mementoSearchTypes'
import { selectMemsByKeywordSearch } from './selectMemsByKeywordSearch'
import { selectMemsBySemanticSimilarity } from './selectMemsBySemanticSimilarity'
import { selectSimilarMementos } from './selectSimilarMementos'

console.log('DEBUG', process.env.DEBUG)
const dlog = debug('search')

function tokenCount(results: MementoSearchResult[]): number {
    return results.reduce((acc, m) => acc + m.tokens, 0)
}

const maxTokens = 2000
const numKeywords = 5

describe('Search', () => {
    let db: MementoDb
    let dbname: string
    beforeAll(async () => {
        dbname = `test_${nanoid()}`
        await createMementoDb(dbname)
        db = await MementoDb.connect(dbname)
        expect(db).toBeTruthy()
        expect(db.name).toBe(dbname)
        expect(db.pool).toBeTruthy()
        await ingestDirectory({ db, dirPath: `${getMementoProjectRoot()}/packages/types` })
    })

    afterAll(async () => {
        expect(db).toBeTruthy()
        await db.close()
        await dropDatabase(dbname)
    })

    it('can run a keyword search for a function declaration', async () => {
        const args: MementoSearchArgs = { content: 'createMem(content: string)', maxTokens, numKeywords }
        const result = await selectMemsByKeywordSearch(db.pool, args)
        dlog(`Result set has ${result.length} entries`)
        expect(result).toBeTruthy()
        expect(result.length).toBeGreaterThan(1)
        expect(result[0].score).toBe(1.0)
        expect(result[result.length - 1].score).toBe(0.0)

        expect(result[0].kind).toBe('doc')
        expect(result[0].source).toBe('packages/types/src/memSchema.ts')
        expect(tokenCount(result)).toBeLessThanOrEqual(maxTokens)
    })

    it('can run a semantic search for a content string', async () => {
        const args: MementoSearchArgs = {
            content: 'A Mem is determined by its content string.',
            maxTokens,
            numKeywords,
        }
        const result = await selectMemsBySemanticSimilarity(db.pool, args)
        dlog(`Result set has ${result.length} entries`)
        expect(result).toBeTruthy()
        expect(result.length).toBeGreaterThan(1)
        expect(result[0].score).toBe(1.0)
        expect(result[result.length - 1].score).toBe(0.0)

        // result.forEach((r) => {
        //     dlog(`Kind: ${r.kind}, Source: ${r.source}, Score: ${r.score}`);
        // });

        expect(result[0].kind).toBe('doc')
        expect(result[0].source).toBe('packages/types/src/memSchema.ts')
        expect(tokenCount(result)).toBeLessThanOrEqual(maxTokens)
    })

    it('can run a combined search for a content string', async () => {
        const args: MementoSearchArgs = {
            content: 'A Mem is determined by its content string.',
            maxTokens,
            numKeywords,
        }
        const result = await selectSimilarMementos(db.pool, args)
        dlog(`Result set has ${result.length} entries`)
        expect(result).toBeTruthy()
        expect(result.length).toBeGreaterThan(1)
        expect(result[0].score).toBe(1.0)
        expect(result[result.length - 1].score).toBe(0.0)

        result.forEach((r) => {
            dlog(`1Kind: ${r.kind}, Source: ${r.source}, Score: ${r.score}`)
        })

        expect(result[0].kind).toBe('doc')
        expect(result[0].source).toBe('packages/types/src/memSchema.ts')

        const trimTo = 1000
        const trimmed = trimSearchResult(result, trimTo)
        expect(tokenCount(trimmed)).toBeLessThanOrEqual(trimTo)
    })

    it('can run a combined search for a function declaration', async () => {
        const args: MementoSearchArgs = { content: 'createMem(content: string)', maxTokens, numKeywords }
        const result = await selectSimilarMementos(db.pool, args)
        dlog(`Result set has ${result.length} entries`)
        expect(result).toBeTruthy()
        expect(result.length).toBeGreaterThan(1)
        const scores: number[] = result.map((r) => r.score)
        expect(Math.max(...scores)).toBe(1.0)
        expect(Math.min(...scores)).toBe(0.0)

        result.forEach((r) => {
            dlog(`2Kind: ${r.kind}, Source: ${r.source}, Score: ${r.score}`)
        })

        expect(result[0].kind).toBe('doc')
        expect(result[0].source).toBe('packages/types/src/memSchema.ts')

        const trimTo = 1000
        const trimmed = trimSearchResult(result, trimTo)
        expect(tokenCount(trimmed)).toBeLessThanOrEqual(trimTo)
    })
})
