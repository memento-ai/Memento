// Path: packages/function-registry/src/writeSourceFile/writeSourceFile.test.ts

import { getMementoProjectRoot } from '@memento-ai/utils'
import { describe, expect, it } from 'bun:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { registry } from '../registry'

describe('writeSourceFile', () => {
    it('should write content to a file and return a success message', async () => {
        const projectRoot = getMementoProjectRoot()
        const writeSourceFile = registry['writeSourceFile']
        expect(writeSourceFile).toBeDefined()

        const testFilePath = 'test-write-file.txt'
        const testContent = 'This is a test content.'

        const result: string = await writeSourceFile.fn({
            filePath: testFilePath,
            content: testContent,
        })

        expect(result).toContain('File successfully written')

        // Verify the file was actually written
        const fullPath = path.join(projectRoot, testFilePath)
        const writtenContent = await fs.readFile(fullPath, 'utf-8')
        expect(writtenContent).toBe(testContent)

        // Clean up: remove the test file
        await fs.unlink(fullPath)
    })

    it('should return an error message for invalid file paths', async () => {
        const writeSourceFile = registry['writeSourceFile']
        expect(writeSourceFile).toBeDefined()

        const result: string = await writeSourceFile.fn({
            filePath: '../outside-project.txt',
            content: 'This should not be written.',
        })

        expect(result).toContain('Error writing to source file')
        expect(result).toContain('Invalid file path')
    })
})
