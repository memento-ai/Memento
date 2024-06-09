// Path: packages/memento-agent/src/retrieveContext.ts

import { DSUM,  SYN, XCHG, DOC } from "@memento-ai/types";
import { gatherContent, kindContent } from "./dynamicContent";
import { generateFunctionDescription } from "@memento-ai/function-calling";
import { registry } from "@memento-ai/function-calling";
import type { DynamicContent } from "./dynamicContent";
import type { MementoAgent } from "./mementoAgent";
import type { MementoPromptTemplateArgs } from "./mementoPromptTemplate";
import type { MementoSearchArgs, MementoSearchResult } from "@memento-ai/search";

export function functionCallingInstructions() : string {
    return `
${Object.values(registry)
    .map(config => generateFunctionDescription(config))
    .join('\n')}
`.trim()
}

export async function retrieveContext(agent: MementoAgent, aggregateSearchResults: MementoSearchResult[]): Promise<MementoPromptTemplateArgs> {
    const functions = functionCallingInstructions();

    const dynamicContent: DynamicContent = await gatherContent(agent.DB, aggregateSearchResults);
    const { additionalContext } = dynamicContent;

    const resolutions = await agent.DB.getResolutions();

    const retrievedContext = {
        functions,
        databaseSchema: agent.databaseSchema,
        resolutions,
        dsumMems: kindContent(DSUM, additionalContext),
        docMems: kindContent(DOC, additionalContext),
        synMems: kindContent(SYN, additionalContext),
        xchgMems: kindContent(XCHG, additionalContext),
    };

    return retrievedContext;
}
