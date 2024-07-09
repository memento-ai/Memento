// Path: packages/utils/src/git-ls-files.test.ts

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { gitListFiles, gitListFilesFor, gitListRepositoryFiles } from './git-ls-files'
import { getMementoProjectRoot } from './project-root'

describe('tests assuming cwd at root of project', () => {
    let cwdBefore: string
    beforeAll(async () => {
        cwdBefore = process.cwd()
        const mementoRoot = getMementoProjectRoot()
        process.chdir(mementoRoot)
    })

    afterAll(() => {
        process.chdir(cwdBefore)
    })

    describe('gitListFiles', () => {
        it('should list the files in the project', async () => {
            const files = gitListFiles()
            expect(files.length).toBeGreaterThan(0)
            expect(files).toContain('packages/utils/src/git-ls-files.ts')
        })
    })

    describe('gitListFiles for dir', () => {
        it('should list the files in the directory with paths relative to the directory', async () => {
            const files = gitListFilesFor('packages/utils')
            expect(files.length).toBeGreaterThan(0)
            expect(files).toContain('src/git-ls-files.ts')
        })
    })
})

describe('gitListRepositoryFiles', () => {
    let files: string[]
    beforeAll(async () => {
        files = gitListRepositoryFiles()
    })

    it('should list all the files in the repository', async () => {
        expect(files.length).toBeGreaterThan(100)
        expect(files).toContain('packages/utils/src/git-ls-files.ts')
    })

    it('should list all the files in the repository when cwd is a subdir', async () => {
        const currentDir = process.cwd()
        const mementoRoot = getMementoProjectRoot()
        process.chdir(`${mementoRoot}/packages`)
        const files2 = gitListRepositoryFiles()
        process.chdir(currentDir)
        expect(files2.length).toEqual(files.length)
        expect([...files].every((x) => new Set(files2).has(x)))
    })
})
