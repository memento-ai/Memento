// Path: packages/memento-agent/src/invokeFunctions.ts
import { type FunctionCallResult, invokeFunctions, type FunctionError, functionCallResultAsString, categorizeExtractedFunctionCalls, extractFunctionCalls, type FunctionCallRequest, type CategorizedFunctionCalls, type FunctionRegistry, isFunctionError } from "@memento-ai/function-calling";
import type { Context } from "@memento-ai/memento-db";
import type { Message } from "ollama";
import debug from "debug";

const dlog = debug("invokeFunctions");

export const FUNCTION_RESULT_HEADER = "SYSTEM: Function call result for";

export type InvokeFunctionsArgs = {
    assistantMessage: Message,
    context: Context,
    registry: FunctionRegistry,
    asyncResultsP: Promise<FunctionCallResult[]>
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

export async function invokeSyncAndAsyncFunctions({ assistantMessage, context, registry, asyncResultsP }: InvokeFunctionsArgs): Promise<InvokeFunctionsResults> {
    const { syncCalls, asyncCalls, badCalls } = checkForFunctionCalls(assistantMessage.content);

    const syncResults: FunctionCallResult[] = await invokeFunctions({registry, calls: syncCalls, context});
    dlog("Extracted function results:", syncResults);

    const asyncErrorResults: FunctionError[] = await getAsyncErrorResults(asyncResultsP);
    let newAsyncResultsP: Promise<FunctionCallResult[]> = Promise.resolve([]);
    if (asyncCalls) {
        // Invoke but do not await the result
        newAsyncResultsP = invokeFunctions({registry, calls: asyncCalls, context});
    }

    const functionResultContent = (syncResults.concat(badCalls).concat(asyncErrorResults)).map((result: FunctionCallResult) => {
        const header = `${FUNCTION_RESULT_HEADER} ${result.name}\n`;
        return header + `\'\'\'result\n${functionCallResultAsString(result)}\n\'\'\'`;
    }).join('\n\n');

    return { functionResultContent, newAsyncResultsP };
}
