// Path: packages/function-calling/src/extractFunctionCalls.ts

import debug from 'debug'
import { parse } from 'dirty-json'
import type { FunctionCall, FunctionCallRequest, FunctionError } from './functionCallingTypes'
import { isFunctionCall } from './functionCallingTypes'

const dlog = debug('extractFunctionCalls')

function validateFunctionCall(functionCallJson: string): FunctionCallRequest {
    const parsed = parse<FunctionCallRequest>(functionCallJson)

    const name: string = parsed.name ?? 'unknown'
    const input: object = parsed.input ?? parsed
    try {
        if (isFunctionCall(parsed)) {
            return parsed
        } else {
            console.warn(parsed)
            return {
                name,
                input,
                error: 'The provided object is not a valid function call. It must have a "name" (string) and an "input" (object) property.',
            }
        }
    } catch (error) {
        return {
            name,
            input,
            error: `Failed to parse the function call as JSON: ${
                (error as Error).message
            }\n\nFunction call:\n\`\`\`\n${functionCallJson}\n\`\`\``,
        }
    }
}

export type ExtractFunctionCallsResult = {
    syncCalls: FunctionCall[]
    asyncCalls: FunctionCall[]
    badCalls: FunctionError[]
    thinking: string
    hasCalls: boolean
}

export function extractFunctionCalls(content: string): ExtractFunctionCallsResult {
    const regex = /^```function\s*([\s\S]*?)\n^```\s*$/gm

    const syncCalls: FunctionCall[] = []
    const asyncCalls: FunctionCall[] = []
    const badCalls: FunctionError[] = []

    let thinking = content.replace(regex, (_, functionCallJson) => {
        const validationResult = validateFunctionCall(functionCallJson)
        if (isFunctionCall(validationResult)) {
            if (validationResult.async) {
                asyncCalls.push(validationResult)
            } else {
                syncCalls.push(validationResult)
            }
        } else {
            badCalls.push(validationResult)
        }
        return ''
    })
    if (thinking.trim() === '') {
        thinking = ''
    }

    const hasCalls = syncCalls.length > 0 || asyncCalls.length > 0 || badCalls.length > 0
    if (hasCalls && thinking === content) {
        throw new Error('Something went wrong with extracting function calls.')
    }

    if (hasCalls) {
        dlog('Extracted function calls:', { content, thinking })
    }

    const result: ExtractFunctionCallsResult = { syncCalls, asyncCalls, badCalls, thinking, hasCalls }
    dlog('Extracted function calls:', Bun.inspect(result, { depth: Infinity, colors: true }))
    return result
}
