// Path: packages/function-registry/src/readSourceFile/readSourceFile.test.ts

import { getMementoProjectRoot } from '@memento-ai/utils'
import { describe, expect, it } from 'bun:test'
import { registry } from '../registry'

describe('readSourceFile', () => {
    it('should read a source file by path', async () => {
        const projectRoot = getMementoProjectRoot()
        const readSourceFile = registry['readSourceFile']
        expect(readSourceFile).toBeDefined()
        const content: string = await readSourceFile.fn({
            filePath: `${projectRoot}/packages/function-registry/src/getCurrentTime/getCurrentTime.ts`,
        })
        expect(typeof content).toBe('string')
        expect(content).toContain('Path: packages/function-registry/src/getCurrentTime/getCurrentTime.ts')
    })
})
