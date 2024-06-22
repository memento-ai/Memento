// Path: packages/function-calling/src/functionRegistry.test.ts

import { getMementoProjectRoot } from '@memento-ai/utils'
import { describe, expect, it } from 'bun:test'
import debug from 'debug'
import fs from 'node:fs/promises'
import path from 'node:path'
import { generateFunctionDescription, getRegistryDescription } from './functionRegistry'
import { registry } from './functions/index'

const dlog = debug('functionRegistry')

describe('generateFunctionDescription', () => {
    it('should generate a description for getCurrentTime', async () => {
        const testConfig = registry['getCurrentTime']
        const description = generateFunctionDescription(testConfig)
        dlog(description)
        const expected = `
Function: getCurrentTime
    Purpose: Returns the current UTC time
    Input: No input parameters are necessary, so provide an empty object.
        context: An optional context object. Leave unspecified -- Memento will provide.
    Output: ISO string`.trim()
        expect(description).toEqual(expected)
    })

    it('should generate all function descriptions', async () => {
        const descriptions = getRegistryDescription(registry)
        dlog(descriptions)
        const expected = `
Available functions:

Function: addSynopsis
    Purpose: Creates one synopsis memento from the input.
    Async: Whether the function should be executed asynchronously
    Input: The input for synopsis
        context: An optional context object. Leave unspecified -- Memento will provide.
        content: A brief synopsis of one conversational exchange -- the assistants inner thoughts.
    Output: The id of the created synopsis meta.

Function: getCurrentTime
    Purpose: Returns the current UTC time
    Input: No input parameters are necessary, so provide an empty object.
        context: An optional context object. Leave unspecified -- Memento will provide.
    Output: ISO string

Function: gitListFiles
    Purpose: Returns list of file paths tracked by git for the current repository.
    Input: No input parameters are necessary, so provide an empty object.
        context: An optional context object. Leave unspecified -- Memento will provide.
    Output: Array of file paths

Function: queryMementoView
    Purpose: Execute a SQL SELECT query on the memento view.
    Input: A read-only query to execute on the memento view.
        context: An optional context object. Leave unspecified -- Memento will provide.
        query: The SQL query to execute.
    Output: The result as a array of rows, or an error message.

Function: readSourceFile
    Purpose: Read the content of a source file and return it as a single string.
    Input: The file path options
        context: An optional context object. Leave unspecified -- Memento will provide.
        filePath: The path to the source file to read.
    Output: The content of the source file as a single string.

Function: writeSourceFile
    Purpose: Write content to a source file and return a status message.
    Input: The file path and content to write
        context: An optional context object. Leave unspecified -- Memento will provide.
        filePath: The path to the source file to write.
        content: The content to write to the file.
    Output: A message indicating success or failure of the write operation.
`.trim()

        const expectedLines = expected.split('\n')
        const descriptionsLines = descriptions.split('\n')
        expect(descriptionsLines).toEqual(expectedLines)
    })
})

describe('getCurrentTime', () => {
    it('should return the current time as an ISO 8601 formatted string', async () => {
        const getCurrentTime = registry['getCurrentTime']
        expect(getCurrentTime).toBeDefined()
        const currentTime: string = await getCurrentTime.fn({})
        expect(typeof currentTime).toBe('string')
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        expect(currentTime).toMatch(dateRegex)
    })
})

describe('readSourceFile', () => {
    it('should read a source file by path', async () => {
        const projectRoot = getMementoProjectRoot()
        const readSourceFile = registry['readSourceFile']
        expect(readSourceFile).toBeDefined()
        const content: string = await readSourceFile.fn({
            filePath: `${projectRoot}/packages/function-calling/src/functions/getCurrentTime.ts`,
        })
        expect(typeof content).toBe('string')
        expect(content).toContain('Path: packages/function-calling/src/functions/getCurrentTime.ts')
    })
})

describe('gitListFiles', () => {
    it('should list tracked git files', async () => {
        const gitListFiles = registry['gitListFiles']
        expect(gitListFiles).toBeDefined()
        const content: string[] = await gitListFiles.fn({})
        expect(content).toContain('packages/function-calling/src/functions/getCurrentTime.ts')
        expect(content).toContain('packages/types/src/mementoSchema.ts')
    })
})

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
