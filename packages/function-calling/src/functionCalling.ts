// Path: packages/function-calling/src/functionCalling.ts

import type { FunctionRegistry } from '@memento-ai/function-registry'
import type { AddFunctionCallArgs, Context } from '@memento-ai/memento-db'
import { addFuncMemento } from '@memento-ai/memento-db'
import type { MetaId } from '@memento-ai/types'
import { stripCommonIndent } from '@memento-ai/utils'
import debug from 'debug'
import Handlebars from 'handlebars'
import type { DatabasePool } from 'slonik'
import type { ExtractFunctionCallsResult, FunctionCallRequest } from '..'
import { isFunctionError, type FunctionCall, type FunctionCallResult } from './functionCallingTypes'

const dlog = debug('functionCalling')

export interface InvokeOneFunctionArgs {
    registry: FunctionRegistry
    call: FunctionCall
    context: Context
}

export interface FuncMemTemplateArgs {
    name: string
    input: string
    output?: string
    error?: string
}

const funcMemTemplateText = stripCommonIndent(`
    <function name="{{name}}">
    <input>
    {{{input}}}
    </input>
    {{#if output}}
    <output>
    {{{output}}}
    </output>
    {{/if}}
    {{#if error}}
    <error>
    {{{error}}}
    </error>
    {{/if}}
    </function>
    `)
const funcMemTemplate = Handlebars.compile<FuncMemTemplateArgs>(funcMemTemplateText)

export type ProcessOneCallArgs = {
    registry: FunctionRegistry
    call: FunctionCallRequest // FunctionCall | FunctionError
    context: Context
}

export async function processOneCall({ registry, call, context }: ProcessOneCallArgs): Promise<MetaId> {
    if (isFunctionError(call)) {
        const { name, error, input } = call
        const content = funcMemTemplate({ name, error, input: JSON.stringify(input) })
        const args: AddFunctionCallArgs = {
            source: name,
            content,
            docid: '',
        }
        return (await addFuncMemento(context.pool, args)).id
    } else {
        return invokeOneFunction({ registry, context, call })
    }
}

export async function invokeOneFunction({ registry, context, call }: InvokeOneFunctionArgs): Promise<MetaId> {
    const { name, input } = call
    const functionDef = registry[name]

    if (!context || (!context.pool && !!context.readonlyPool)) {
        throw new Error('Context is required')
    }

    let result: FunctionCallResult
    if (functionDef) {
        // Execute the function with the provided input and additional context
        dlog(`Calling function(${name}) with input:`, input)
        result = { name, output: await functionDef.fn(input, context) }
        dlog('Got function result:', result)
    } else {
        const error = `Function "${name}" not found in the function registry.`
        result = { input, name, error }
        dlog('Got function error:', result)
    }

    const funcTemplateArgs: FuncMemTemplateArgs = {
        name,
        input: JSON.stringify(input),
    }

    if (isFunctionError(result)) {
        funcTemplateArgs.error = `Function "${name}" returned an error: ${result.error}`
    } else {
        funcTemplateArgs.output = JSON.stringify(result.output)
    }

    let funcMementoId = ''
    if (context.pool) {
        const content: string = funcMemTemplate(funcTemplateArgs)
        dlog('Adding func memento:', content.slice(0, 100))
        const args: AddFunctionCallArgs = {
            source: name,
            content,
            docid: '',
        }
        const pool = context.pool as DatabasePool
        funcMementoId = (await addFuncMemento(pool, args)).id
    }

    dlog('Created func memento id:', funcMementoId)
    return funcMementoId
}

export interface InvokeMultFunctionsArgs {
    registry: FunctionRegistry
    context: Context
    calls: FunctionCallRequest[]
}

export async function invokeMultFunctions({ registry, calls, context }: InvokeMultFunctionsArgs): Promise<MetaId[]> {
    return Promise.all(
        calls.map(async (call): Promise<MetaId> => {
            return await processOneCall({ registry, context, call })
        }),
    )
}

export type InvokeFunctionsArgs = {
    extracted: ExtractFunctionCallsResult
    context: Context
    registry: FunctionRegistry
}

export type InvokeFunctionsResults = {
    newAsyncResultsP: Promise<MetaId[]>
    funcMementoIds: MetaId[]
}
