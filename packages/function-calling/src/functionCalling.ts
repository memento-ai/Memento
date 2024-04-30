// Path: packages/function-calling/src/functionCalling.ts

import type { BaseInput, FunctionConfig, FunctionRegistry } from "./functionRegistry";
import type { Context } from "@memento-ai/memento-db";
import debug from "debug";

const dlog = debug("functionCalling");

export type SyncFunctionCall = {
    name: string,
    async?: false | undefined
    input: BaseInput,
    context?: Context,
}

export type AsyncFunctionCall = {
    name: string,
    async: true,
    input: BaseInput,
    context?: Context,
}

export type FunctionCall = SyncFunctionCall | AsyncFunctionCall;

export interface FunctionError {
    name: string; // The name of the function that was called
    error: string;
}

export type FunctionCallRequest = FunctionCall | FunctionError;

export interface FunctionResult {
    name: string; // The name of the function that was called
    output: string | object;
}

export type FunctionCallResult = FunctionResult | FunctionError;

export function isFunctionResult(value: unknown): value is FunctionResult {
  return value != null
    && typeof value === 'object'
    && ('output' in value)
    && (typeof value.output === 'string' || typeof value.output === 'object');
}

export function isFunctionCall(value: unknown): value is FunctionCall {
    return value != null
        && typeof value === 'object'
        && 'name' in value
        && 'input' in value
        && typeof value.name === 'string'
        && typeof value.input === 'object';
}

export function isFunctionError(value: unknown): value is FunctionError {
    return value != null
        && typeof value === 'object'
        && 'error' in value
        && typeof value.error === 'string';
}

export function functionCallResultAsString(result: FunctionCallResult) {
    if (isFunctionError(result)) {
        return JSON.stringify(result);
    } else if (typeof result.output === 'string' ) {
        return result.output;
    } else {
        return JSON.stringify(result.output);
    }
}

export function* extractFunctionCalls(content: string): Generator<FunctionCallRequest, void, undefined> {
    const regex = /^```function\s*([\s\S]*?)\n^```$/gm;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
        const functionCallJson = match[1].trim();
        const validationResult = validateFunctionCall(functionCallJson);

        yield validationResult;
    }
}

interface CategorizedFunctionCalls {
    syncCalls: FunctionCall[];
    asyncCalls: FunctionCall[];
    badCalls: FunctionError[];
}

export function categorizeExtractedFunctionCalls(functionCalls: FunctionCallRequest[]): CategorizedFunctionCalls {
    const syncCalls: FunctionCall[] = [];
    const asyncCalls: FunctionCall[] = [];
    const badCalls: FunctionError[] = [];

    for (const call of functionCalls) {
        if (isFunctionCall(call)) {
            if (call.async) {
                asyncCalls.push(call);
            } else {
                syncCalls.push(call);
            }
        } else if (isFunctionError(call)) {
            badCalls.push(call);
        } else {
            badCalls.push({
                name: 'unknown',
                error: 'The provided object is not a valid function call or error.',
            });
        }
    }

    return { syncCalls, asyncCalls, badCalls };
}

export function validateFunctionCall(functionCallJson: string): FunctionCallRequest {
    try {
        const parsed = JSON.parse(functionCallJson);
        const name = parsed.name;
        if (isFunctionCall(parsed)) {
            return parsed;
        } else {
            return {
                name: name,
                error: 'The provided object is not a valid function call. It must have a "name" (string) and an "input" (object) property.',
            };
        }
    } catch (error) {
        return {
            name: 'unknown',
            error: `Failed to parse the function call as JSON: ${(error as Error).message}\n\nFunction call:\n\`\`\`\n${functionCallJson}\n\`\`\``,
        };
    }
}

export interface InvokeFunctionArgs {
    registry: FunctionRegistry,
    call: FunctionCall,
    context: Context,
}

export async function invokeFunction({registry, context, call}: InvokeFunctionArgs) : Promise<FunctionCallResult> {
    const { name, input } = call;
    const functionDef: FunctionConfig<any, any> = registry[name];

    if (functionDef) {
        // Execute the function with the provided input and additional context
        input.context = context;
        dlog(`Calling function(${name}) with input:`, {input});
        const result = { name, output: await functionDef.fn(input) };
        dlog('Got function result:', result);
        return result;
    } else {
        const error = `Function "${name}" not found in the function registry.`
        return { name, error };
    }
}

export interface InvokeFunctionsArgs {
    registry: FunctionRegistry,
    context: Context,
    calls: FunctionCallRequest[],
}

export async function invokeFunctions({ registry, calls, context}: InvokeFunctionsArgs): Promise<FunctionCallResult[]> {
    return Promise.all(calls.map(async (call): Promise<FunctionCallResult> => {
        const { name } = call;
        if (isFunctionError(call)) {
            return call;
        } else if (isFunctionCall(call)) {
            return await invokeFunction({ registry, context, call });
        }
        else {
            const error = `Invalid function call request: ${JSON.stringify(call)}`;
            return { name, error };
        }
    }));
}
