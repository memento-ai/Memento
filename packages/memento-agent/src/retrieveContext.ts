// Path: packages/memento-agent/src/retrieveContext.ts

import { generateFunctionDescription, registry } from '@memento-ai/function-registry'
import type { MementoSearchResult } from '@memento-ai/search'
import { DOC, DSUM, SYN, XCHG } from '@memento-ai/types'
import type { DynamicContent } from './dynamicContent'
import { gatherContent, kindContent } from './dynamicContent'
import type { MementoAgent } from './mementoAgent'
import type { MementoPromptTemplateArgs } from './mementoPromptTemplate'

export function functionCallingInstructions(): string {
    return `
${Object.values(registry)
    .map((config) => generateFunctionDescription(config))
    .join('\n')}
`.trim()
}

export async function retrieveContext(
    agent: MementoAgent,
    aggregateSearchResults: MementoSearchResult[]
): Promise<MementoPromptTemplateArgs> {
    const functions = functionCallingInstructions()

    const dynamicContent: DynamicContent = await gatherContent(agent.db, aggregateSearchResults, agent.config)
    const { additionalContext } = dynamicContent

    const resolutions = await agent.db.getResolutions()

    const retrievedContext = {
        functions,
        databaseSchema: agent.databaseSchema,
        resolutions,
        dsumMems: kindContent(DSUM, additionalContext),
        docMems: kindContent(DOC, additionalContext),
        synMems: kindContent(SYN, additionalContext),
        xchgMems: kindContent(XCHG, additionalContext),
    }

    return retrievedContext
}
