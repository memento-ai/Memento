// Path: packages/function-calling/src/functionCalling.ts

import type { BaseInput, FunctionConfig, FunctionRegistry } from "./functionRegistry";
import type { Context } from "@memento-ai/memento-db";
import type { AssistantMessage } from "@memento-ai/types";
import { stripCommonIndent } from "@memento-ai/utils";
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
    const regex = /^```function\s*([\s\S]*?)\n^```\s*$/gm;

    const syncCalls: FunctionCall[] = [];
    const asyncCalls: FunctionCall[] = [];
    const badCalls: FunctionError[] = [];

    const residue = content.replace(regex, (_, functionCallJson) => {
        const validationResult = validateFunctionCall(functionCallJson);
        if (isFunctionCall(validationResult)) {
            if (validationResult.async) {
                asyncCalls.push(validationResult);
            } else {
                syncCalls.push(validationResult);
            }
        } else {
            badCalls.push(validationResult);
        }
        return '';
    });

    const foundCalls = syncCalls.length + asyncCalls.length;

    if (foundCalls > 0 && residue.trim().length > 0) {
        const error = {
            name: 'MixedContentError',
            error: stripCommonIndent(`A response with any function call requests must contain only function calls.
            Hold any commentary until after you have received the function calls results. This extra content should have been witheld:
            \`\`\`
            ${residue}
            \`\`\``),
        };
        badCalls.push(error);
    }

    if (badCalls.length > 0) {
        yield* badCalls;
    } else {
        yield* syncCalls;
        yield* asyncCalls;
    }

    return;
}

export interface CategorizedFunctionCalls {
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

export interface InvokeOneFunctionArgs {
    registry: FunctionRegistry,
    call: FunctionCall,
    context: Context,
}

export async function invokeOneFunction({registry, context, call}: InvokeOneFunctionArgs) : Promise<FunctionCallResult> {
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

export interface InvokeMultFunctionsArgs {
    registry: FunctionRegistry,
    context: Context,
    calls: FunctionCallRequest[],
}

export async function invokeMultFunctions({ registry, calls, context}: InvokeMultFunctionsArgs): Promise<FunctionCallResult[]> {
    return Promise.all(calls.map(async (call): Promise<FunctionCallResult> => {
        const { name } = call;
        if (isFunctionError(call)) {
            return call;
        } else if (isFunctionCall(call)) {
            return await invokeOneFunction({ registry, context, call });
        }
        else {
            const error = `Invalid function call request: ${JSON.stringify(call)}`;
            return { name, error };
        }
    }));
}

export const FUNCTION_RESULT_HEADER = "SYSTEM: Function call result for";

export type InvokeFunctionsArgs = {
    assistantMessage: AssistantMessage,
    context: Context,
    registry: FunctionRegistry,
    asyncResultsP: Promise<FunctionCallResult[]>
    cycleCount: number;
};

function checkForFunctionCalls(content: string): CategorizedFunctionCalls {
    const functionCalls: FunctionCallRequest[] = Array.from(extractFunctionCalls(content));
    const categorizedCalls = categorizeExtractedFunctionCalls(functionCalls);
    dlog("Extracted function calls:", categorizedCalls);
    return categorizedCalls;
}

async function getAsyncErrorResults(asyncResultsP: Promise<FunctionCallResult[]>): Promise<FunctionError[]> {

    let asyncErrorResults: FunctionError[] = [];
    let asyncResults = await asyncResultsP;
    if (asyncResults.length > 0) {
        asyncErrorResults = asyncResults.filter(result => isFunctionError(result)) as FunctionError[];
    }

    return asyncErrorResults;
}

export type InvokeFunctionsResults = {
    functionResultContent: string;
    newAsyncResultsP: Promise<FunctionCallResult[]>;
};

export async function invokeSyncAndAsyncFunctions({ assistantMessage, context, registry, asyncResultsP, cycleCount }: InvokeFunctionsArgs): Promise<InvokeFunctionsResults> {
    let newAsyncResultsP: Promise<FunctionCallResult[]> = Promise.resolve([]);

    let { syncCalls, asyncCalls, badCalls } = checkForFunctionCalls(assistantMessage.content);

    if ((syncCalls.length > 0 || asyncCalls.length > 0 && badCalls.length > 0) && cycleCount > 4) {
        const error = {
            name: 'FunctionCallLimitError',
            error: stripCommonIndent(`You have exceeded the function call limit of 5 calls.
            Please wait for the results of the current function calls before making more requests.`),
        };
        console.error("Function call limit exceeded");
        syncCalls = [];
        asyncCalls = [];
        badCalls.push(error);
    }

    let functionResultContent = "";
    if (badCalls.length > 0) {
        // debug.enable('invokeMultFunctions')
        dlog("Bad function calls:", Bun.inspect(badCalls));
        functionResultContent = badCalls.map((result: FunctionCallResult) => {
            const header = `${FUNCTION_RESULT_HEADER} ${result.name}\n`;
            return header + `\'\'\'result\n${functionCallResultAsString(result)}\n\'\'\'`;
        }).join('\n\n');
    } else {
        const syncResults: FunctionCallResult[] = await invokeMultFunctions({registry, calls: syncCalls, context});
        dlog("Extracted function results:", syncResults);

        const asyncErrorResults: FunctionError[] = await getAsyncErrorResults(asyncResultsP);
        if (asyncCalls) {
            // Invoke but do not await the result
            newAsyncResultsP = invokeMultFunctions({registry, calls: asyncCalls, context});
        }

        functionResultContent = (syncResults.concat(badCalls).concat(asyncErrorResults)).map((result: FunctionCallResult) => {
            const header = `${FUNCTION_RESULT_HEADER} ${result.name}\n`;
            return header + `\'\'\'result\n${functionCallResultAsString(result)}\n\'\'\'`;
        }).join('\n\n');
    }

    return { functionResultContent, newAsyncResultsP };
}
