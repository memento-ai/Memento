// Path: packages/function-calling/src/functionCalling.test.ts

import { registry } from '@memento-ai/function-registry'
import { describe, expect, it } from 'bun:test'
import {
    extractFunctionCalls,
    invokeOneFunction,
    isFunctionError,
    isFunctionResult,
    type FunctionCallRequest,
    type FunctionCallResult,
} from '..'

describe('functionCalling', () => {
    it('should return the current time as an ISO 8601 formatted string', async () => {
        const call: FunctionCallRequest = {
            name: 'getCurrentTime',
            input: {},
        }

        const context = {}
        const result: FunctionCallResult = await invokeOneFunction({ registry, call, context })

        expect(isFunctionError(result)).toBe(false)
        expect(isFunctionResult(result)).toBe(true)

        if (isFunctionResult(result)) {
            const currentTime = result.output
            expect(typeof currentTime).toBe('string')
            const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            expect(currentTime).toMatch(dateRegex)
        }
    })
})

describe('extractFunctionCalls', () => {
    it('should extract no function calls from empty content', () => {
        const content = ''
        const functionCalls = Array.from(extractFunctionCalls(content))
        expect(functionCalls.length).toBe(0)
    })

    it('should extract no function calls from plain content without markers', () => {
        const content = `
This is a few
lines of nonsense
for testing purposes`
        const functionCalls = Array.from(extractFunctionCalls(content))
        expect(functionCalls.length).toBe(0)
    })

    it('should extract a function call from a pure function call request', () => {
        const content = '```function\n{\n  "name": "getCurrentTime",\n  "input": {}\n}\n```'
        const functionCalls: FunctionCallRequest[] = Array.from(extractFunctionCalls(content))
        expect(functionCalls.length).toBe(1)
        expect(functionCalls[0]).toEqual({
            name: 'getCurrentTime',
            input: {},
        })
    })

    it('should extract multiple function calls', () => {
        const content = `
\`\`\`function
{
    "name": "getCurrentTime",
    "input": {}
}
\`\`\`
\`\`\`function
{
    "name": "getListFiles",
    "input": {}
}
\`\`\``.trim()

        const functionCalls: FunctionCallRequest[] = Array.from(extractFunctionCalls(content))
        expect(functionCalls.length).toBe(2)
        expect(functionCalls[0]).toEqual({
            name: 'getCurrentTime',
            input: {},
        })
        expect(functionCalls[1]).toEqual({
            name: 'getListFiles',
            input: {},
        })
    })
})
