// Path: packages/function-calling/src/invokeSyncAndAsyncFunctions.ts

import { stripCommonIndent } from '@memento-ai/utils'
import debug from 'debug'
import { extractFunctionCalls } from './extractFunctionCalls'
import type { InvokeFunctionsArgs, InvokeFunctionsResults } from './functionCalling'
import { invokeMultFunctions } from './functionCalling'
import type {
    CategorizedFunctionCalls,
    FunctionCall,
    FunctionCallRequest,
    FunctionCallResult,
    FunctionError,
} from './functionCallingTypes'
import {
    FUNCTION_RESULT_HEADER,
    functionCallResultAsString,
    isFunctionCall,
    isFunctionError,
} from './functionCallingTypes'

const dlog = debug('invokeSyncAndAsyncFunctions')

function categorizeExtractedFunctionCalls(functionCalls: FunctionCallRequest[]): CategorizedFunctionCalls {
    const syncCalls: FunctionCall[] = []
    const asyncCalls: FunctionCall[] = []
    const badCalls: FunctionError[] = []

    for (const call of functionCalls) {
        if (isFunctionCall(call)) {
            if (call.async) {
                asyncCalls.push(call)
            } else {
                syncCalls.push(call)
            }
        } else if (isFunctionError(call)) {
            badCalls.push(call)
        } else {
            badCalls.push({
                name: 'unknown',
                error: 'The provided object is not a valid function call or error.',
            })
        }
    }

    return { syncCalls, asyncCalls, badCalls }
}

function checkForFunctionCalls(content: string): CategorizedFunctionCalls {
    const functionCalls: FunctionCallRequest[] = Array.from(extractFunctionCalls(content))
    const categorizedCalls = categorizeExtractedFunctionCalls(functionCalls)
    dlog('Extracted function calls:', categorizedCalls)
    return categorizedCalls
}

async function getAsyncErrorResults(asyncResultsP: Promise<FunctionCallResult[]>): Promise<FunctionError[]> {
    let asyncErrorResults: FunctionError[] = []
    const asyncResults = await asyncResultsP
    if (asyncResults.length > 0) {
        asyncErrorResults = asyncResults.filter((result) => isFunctionError(result)) as FunctionError[]
    }

    return asyncErrorResults
}

export async function invokeSyncAndAsyncFunctions({
    assistantMessage,
    context,
    registry,
    asyncResultsP,
    cycleCount,
}: InvokeFunctionsArgs): Promise<InvokeFunctionsResults> {
    let newAsyncResultsP: Promise<FunctionCallResult[]> = Promise.resolve([])

    const { syncCalls, asyncCalls, badCalls } = checkForFunctionCalls(assistantMessage.content)

    if ((syncCalls.length > 0 || (asyncCalls.length > 0 && badCalls.length > 0)) && cycleCount > 4) {
        const error = {
            name: 'FunctionCallLimitError',
            error: stripCommonIndent(`You have exceeded the function call limit of 5 calls.
            Please wait for the results of the current function calls before making more requests.`),
        }
        console.error('Function call limit exceeded')
        syncCalls.length = 0
        asyncCalls.length = 0
        badCalls.push(error)
    }

    let functionResultContent = ''
    if (badCalls.length > 0) {
        // debug.enable('invokeMultFunctions')
        dlog('Bad function calls:', Bun.inspect(badCalls))
        functionResultContent = badCalls
            .map((result: FunctionCallResult) => {
                const header = `${FUNCTION_RESULT_HEADER} ${result.name}\n`
                return header + `'''result\n${functionCallResultAsString(result)}\n'''`
            })
            .join('\n\n')
    } else {
        const syncResults: FunctionCallResult[] = await invokeMultFunctions({ registry, calls: syncCalls, context })
        dlog('Extracted function results:', syncResults)

        const asyncErrorResults: FunctionError[] = await getAsyncErrorResults(asyncResultsP)
        if (asyncCalls) {
            // Invoke but do not await the result
            newAsyncResultsP = invokeMultFunctions({ registry, calls: asyncCalls, context })
        }

        functionResultContent = syncResults
            .concat(badCalls)
            .concat(asyncErrorResults)
            .map((result: FunctionCallResult) => {
                const header = `${FUNCTION_RESULT_HEADER} ${result.name}\n`
                return header + `'''result\n${functionCallResultAsString(result)}\n'''`
            })
            .join('\n\n')
    }

    return { functionResultContent, newAsyncResultsP }
}
