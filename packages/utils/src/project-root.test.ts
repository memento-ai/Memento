// Path: packages/utils/src/project-root.test.ts

import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { getMementoProjectRoot } from './project-root'

describe('getProjectRoot', () => {
    it('should return the root of the project', () => {
        const root = getMementoProjectRoot()
        const name = path.basename(root)
        expect(name).toBe('Memento')
    })
})
