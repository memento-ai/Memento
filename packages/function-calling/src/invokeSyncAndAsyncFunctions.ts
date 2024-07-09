// Path: packages/function-calling/src/invokeSyncAndAsyncFunctions.ts

import { MetaId } from '@memento-ai/types'
import type { InvokeFunctionsArgs, InvokeFunctionsResults } from './functionCalling'
import { invokeMultFunctions } from './functionCalling'

export async function invokeSyncAndAsyncFunctions({
    extracted,
    context,
    registry,
}: InvokeFunctionsArgs): Promise<InvokeFunctionsResults> {
    let newAsyncResultsP: Promise<MetaId[]> = Promise.resolve([])
    const funcMementoIds: MetaId[] = []

    const { syncCalls, asyncCalls, badCalls, hasCalls } = extracted

    if (!hasCalls) {
        throw new Error('There must be function calls here')
    }

    if (badCalls.length > 0) {
        console.error('Bad function calls:', Bun.inspect(badCalls))
        funcMementoIds.push(...(await invokeMultFunctions({ registry, calls: badCalls, context })))
    } else if (syncCalls.length > 0) {
        funcMementoIds.push(...(await invokeMultFunctions({ registry, calls: syncCalls, context })))
    } else if (asyncCalls.length > 0) {
        newAsyncResultsP = invokeMultFunctions({ registry, calls: asyncCalls, context })
    }

    return { newAsyncResultsP, funcMementoIds }
}
