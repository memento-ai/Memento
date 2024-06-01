// Path: packages/function-calling/src/functionCallingTypes.ts

import type { BaseInput } from "./functionRegistry";
import type { Context } from "@memento-ai/memento-db";

export const FUNCTION_RESULT_HEADER = "SYSTEM: Function call result for";

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

export interface CategorizedFunctionCalls {
    syncCalls: FunctionCall[];
    asyncCalls: FunctionCall[];
    badCalls: FunctionError[];
}

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
