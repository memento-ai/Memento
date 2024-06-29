// Path: packages/function-registry/src/gitListFiles/gitListFiles.test.ts

import { describe, expect, it } from 'bun:test'
import { registry } from '../registry'

describe('gitListFiles', () => {
    it('should list tracked git files', async () => {
        const gitListFiles = registry['gitListFiles']
        expect(gitListFiles).toBeDefined()
        const content: string[] = await gitListFiles.fn({})
        expect(content).toContain('packages/function-registry/src/getCurrentTime/getCurrentTime.ts')
        expect(content).toContain('packages/types/src/mementoSchema.ts')
    })
})
