// Path: packages/function-registry/src/readSourceFile/readSourceFile.test.ts

import { describe, expect, it } from 'bun:test'
import { registry } from '../registry'

describe('readSourceFile', () => {
    it('should read a source file by path', async () => {
        const readSourceFile = registry['readSourceFile']
        expect(readSourceFile).toBeDefined()
        const content: string = await readSourceFile.fn(
            {
                filePath: `packages/function-registry/src/getCurrentTime/getCurrentTime.ts`,
            },
            { pool: null },
        )
        expect(typeof content).toBe('string')
        expect(content).toContain('Path: packages/function-registry/src/getCurrentTime/getCurrentTime.ts')
    })
})
