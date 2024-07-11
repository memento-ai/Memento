// Path: packages/memento-agent/src/retrieveContext.ts

import { generateFunctionDescription, registry } from '@memento-ai/function-registry'
import type { MementoDb } from '@memento-ai/memento-db'
import type { MementoSearchResult } from '@memento-ai/search'
import { DOC, DSUM, FunctionCallMemento, XCHG } from '@memento-ai/types'
import { zodParse } from '@memento-ai/utils'
import debug from 'debug'
import { sql } from 'slonik'
import type { DynamicContent } from './dynamicContent'
import { gatherContent, kindContent } from './dynamicContent'
import type { MementoAgent } from './mementoAgent'
import type { MementoPromptTemplateArgs } from './mementoPromptTemplate'
import { PartialFuncMemento } from './prompt-partials/func_mementos'

const dlog = debug('retrieveContext')

export function functionCallingInstructions(): string {
    return `
${Object.values(registry)
    .map((config) => generateFunctionDescription(config))
    .join('\n')}
`.trim()
}

async function getFunctionMementos(db: MementoDb, xchg_ids: string[]): Promise<PartialFuncMemento[]> {
    if (xchg_ids.length === 0) {
        return []
    }
    dlog('getFunctionMementos', xchg_ids)
    const result = await db.pool
        .query(
            sql.type(FunctionCallMemento)`
                SELECT id, docid, created_at, source, content
                FROM memento
                WHERE kind = 'func' AND created_at >= (
                    SELECT MIN(created_at)
                    FROM memento
                    WHERE kind = 'xchg' AND id IN (${sql.join(xchg_ids, sql.fragment`, `)})
                )
                ORDER BY created_at ASC
            `,
        )
        .catch((err) => {
            Error.captureStackTrace(err)
            console.error(err.stack)
            throw err
        })
    const mementos: PartialFuncMemento[] = result.rows.map((memento) => zodParse(PartialFuncMemento, memento))
    dlog('getFunctionMementos got', mementos)
    return mementos
}

export type RetrieveContextArgs = {
    agent: MementoAgent
    aggregateSearchResults: MementoSearchResult[]
    xchg_ids: string[]
}

export async function retrieveContext({
    agent,
    aggregateSearchResults,
    xchg_ids,
}: RetrieveContextArgs): Promise<MementoPromptTemplateArgs> {
    dlog('retrieveContext start', xchg_ids)
    const functions = functionCallingInstructions()

    const dynamicContent: DynamicContent = await gatherContent(agent.db, aggregateSearchResults, agent.config)
    const { additionalContext } = dynamicContent

    const resolutions = await agent.db.getResolutions()

    const synMems = await agent.db.getSynopses({ max_tokens: agent.config.synopses.max_tokens })

    let funcMems: PartialFuncMemento[] = []
    if (xchg_ids) {
        funcMems = await getFunctionMementos(agent.db, xchg_ids)
    }

    const retrievedContext: MementoPromptTemplateArgs = {
        functions,
        databaseSchema: agent.databaseSchema,
        resolutions,
        dsumMems: kindContent(DSUM, additionalContext),
        docMems: kindContent(DOC, additionalContext),
        synMems,
        xchgMems: kindContent(XCHG, additionalContext),
        funcMems,
    }

    dlog('retrieveContext end')
    return retrievedContext
}
