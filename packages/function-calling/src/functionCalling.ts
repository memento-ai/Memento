// Path: packages/function-calling/src/functionCalling.ts

import { isFunctionError, isFunctionCall } from "./functionCallingTypes";
import debug from "debug";
import type { AssistantMessage } from "@memento-ai/types";
import type { Context } from "@memento-ai/memento-db";
import type { FunctionCallResult, FunctionCallRequest, FunctionCall } from "./functionCallingTypes";
import type { FunctionConfig, FunctionRegistry } from "./functionRegistry";

const dlog = debug("functionCalling");

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

export type InvokeFunctionsArgs = {
    assistantMessage: AssistantMessage,
    context: Context,
    registry: FunctionRegistry,
    asyncResultsP: Promise<FunctionCallResult[]>
    cycleCount: number;
};

export type InvokeFunctionsResults = {
    functionResultContent: string;
    newAsyncResultsP: Promise<FunctionCallResult[]>;
};
