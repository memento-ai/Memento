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
