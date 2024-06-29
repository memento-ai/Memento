// Path: packages/utils/src/git-repo-root.test.ts

import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { gitRepoRoot, gitRepoRootForDir } from './git-repo-root'

describe('getProjectRoot', () => {
    it('should return the root of the project', async () => {
        const root = await gitRepoRoot()
        const name = path.basename(root)
        expect(name).toBe('Memento')
    })
})

describe('gitRepoRootForDir', () => {
    it('should return the root of the project for dir', async () => {
        const root = await gitRepoRootForDir(`${import.meta.dirname}`)
        const name = path.basename(root)
        expect(name).toBe('Memento')
    })
})
