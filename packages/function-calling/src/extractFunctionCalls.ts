// Path: packages/function-calling/src/extractFunctionCalls.ts

import { stripCommonIndent } from '@memento-ai/utils'
import type { FunctionCall, FunctionCallRequest, FunctionError } from './functionCallingTypes'
import { isFunctionCall } from './functionCallingTypes'

function validateFunctionCall(functionCallJson: string): FunctionCallRequest {
    try {
        const parsed = JSON.parse(functionCallJson)
        const name = parsed.name
        if (isFunctionCall(parsed)) {
            return parsed
        } else {
            return {
                name: name,
                error: 'The provided object is not a valid function call. It must have a "name" (string) and an "input" (object) property.',
            }
        }
    } catch (error) {
        return {
            name: 'unknown',
            error: `Failed to parse the function call as JSON: ${
                (error as Error).message
            }\n\nFunction call:\n\`\`\`\n${functionCallJson}\n\`\`\``,
        }
    }
}

export function* extractFunctionCalls(content: string): Generator<FunctionCallRequest, void, undefined> {
    const regex = /^```function\s*([\s\S]*?)\n^```\s*$/gm

    const syncCalls: FunctionCall[] = []
    const asyncCalls: FunctionCall[] = []
    const badCalls: FunctionError[] = []

    const residue = content.replace(regex, (_, functionCallJson) => {
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

    const foundCalls = syncCalls.length + asyncCalls.length

    if (foundCalls > 0 && residue.trim().length > 0) {
        const error = {
            name: 'MixedContentError',
            error: stripCommonIndent(`A response with any function call requests must contain only function calls.
            Hold any commentary until after you have received the function calls results. This extra content should have been witheld:
            \`\`\`
            ${residue}
            \`\`\``),
        }
        badCalls.push(error)
    }

    if (badCalls.length > 0) {
        yield* badCalls
    } else {
        yield* syncCalls
        yield* asyncCalls
    }

    return
}
