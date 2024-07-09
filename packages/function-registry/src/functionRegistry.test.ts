// Path: packages/function-registry/src/functionRegistry.test.ts

import { describe, expect, it } from 'bun:test'
import debug from 'debug'
import { generateFunctionDescription, getRegistryDescription } from './functionRegistry'
import { registry } from './registry'

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
    Output: ISO string`.trim()
        expect(description).toEqual(expected)
    })

    it('should generate all function descriptions', async () => {
        const descriptions = getRegistryDescription(registry)
        dlog(descriptions)
        const expected = `
Available functions:

Function: getCurrentTime
    Purpose: Returns the current UTC time
    Input: No input parameters are necessary, so provide an empty object.
    Output: ISO string

Function: gitListFiles
    Purpose: Returns list of file paths tracked by git for the current repository.
    Input: No input parameters are necessary, so provide an empty object.
    Output: Array of file paths

Function: queryMementoView
    Purpose: Execute a SQL SELECT query on the memento view.
    Input: A read-only query to execute on the memento view.
        query: The SQL query to execute.
    Output: The result as a array of rows, or an error message.

Function: readSourceFile
    Purpose: Read the content of a source file and return it as a single string.
    Input: The file path options
        filePath: The path to the source file to read.
    Output: The content of the source file as a single string.

Function: writeSourceFile
    Purpose: Write content to a source file and return a status message.
    Input: The file path and content to write
        filePath: The path to the source file to write.
        content: The content to write to the file. Can be a string or an object that will be stringified.
    Output: A message indicating success or failure of the write operation.
`.trim()

        const expectedLines = expected.split('\n')
        const descriptionsLines = descriptions.split('\n')
        expect(descriptionsLines).toEqual(expectedLines)
    })
})
