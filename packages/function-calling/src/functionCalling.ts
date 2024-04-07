/// File: src/lib/functionCalling.ts

import type { BaseInput, FunctionConfig } from "./functionRegistry";
import { registry } from "./functions";
import type { Context } from "@memento-ai/memento-db";
import debug from "debug";

const dlog = debug("functionCalling");

export interface FunctionCall {
    name: string,
    input: BaseInput,
    context?: Context,
}

export interface FunctionError {
    error: string;
}

export type FunctionCallRequest = FunctionCall | FunctionError;

export interface FunctionResult {
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
    const regex = /```function([\s\S]*?)```/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
        const functionCallJson = match[1].trim();
        const validationResult = validateFunctionCall(functionCallJson);

        yield validationResult;
    }
}

export function validateFunctionCall(functionCallJson: string): FunctionCallRequest {
    try {
        const parsed = JSON.parse(functionCallJson);

        if (isFunctionCall(parsed)) {
            return parsed;
        } else {
            return {
                error: 'The provided object is not a valid function call. It must have a "name" (string) and an "input" (object) property.',
            };
        }
    } catch (error) {
        return {
            error: `Failed to parse the function call as JSON: ${(error as Error).message}\n\nFunction call:\n\`\`\`\n${functionCallJson}\n\`\`\``,
        };
    }
}

export async function invokeFunction(call: FunctionCall, context: Context) : Promise<FunctionCallResult> {
    const { name, input } = call;
    const functionDef: FunctionConfig<any, any> = registry[name];

    if (functionDef) {
        // Execute the function with the provided input and additional context
        input.context = context;
        dlog(`Calling function(${name}) with input:`, {input});
        const result = { output: await functionDef.fn(input) };
        dlog('Got function result:', result);
        return result;
    } else {
        const error = `Function "${name}" not found in the function registry.`
        return { error };
    }
}

export async function invokeFunctions(calls: FunctionCallRequest[], context: Context): Promise<FunctionCallResult[]> {
    return Promise.all(calls.map(async (call): Promise<FunctionCallResult> => {
        if (isFunctionError(call)) {
            return call;
        } else if (isFunctionCall(call)) {
            return await invokeFunction(call, context);
        }
        else {
            const error = `Invalid function call request: ${JSON.stringify(call)}`;
            return { error };
        }
    }));
}
