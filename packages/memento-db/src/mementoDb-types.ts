// Path: packages/memento-db/src/mementoDb-types.ts

import type { Role } from '@memento-ai/types'
import { MetaId } from '@memento-ai/types'
import { z } from 'zod'

export const Context = z.object({
    readonlyPool: z.any(), // DatabasePool
    pool: z.any(), // DatabasePool
})
export type Context = z.infer<typeof Context>

export type AddResponse = {
    error: string
}

// The Add*Args types below are closely related to the *MemArgs types defined in mementoSchema,
// and possibly should be the same type.

export type AddConvArgs = {
    content: string
    role: Role
    priority?: number
}

export type MessagePair = {
    userContent: string
    asstContent: string
}

export type AddConvExchangeFuncArgs = MessagePair & {
    funcMementoIds: MetaId[]
}

export type AddSysArgs = {
    content: string
    priority: number
}

export type AddFragArgs = {
    content: string
    docid: MetaId
}

export type AddDocAndSummaryArgs = {
    source: string
    content: string
    summary: MetaId
}

export type AddResolutionArgs = {
    content: string
}

export type AddSynopsisArgs = {
    content: string
}

export type AddFunctionCallArgs = {
    docid: MetaId // The id of the XCHG
    source: string // The function name
    content: string
}

export const SimilarityResult = z.object({
    id: MetaId,
    kind: z.string(),
    content: z.string(),
    source: MetaId,
    created_at: z.number(),
    tokens: z.number(),
    similarity: z.number(),
})
export type SimilarityResult = z.TypeOf<typeof SimilarityResult>

export interface DocAndSummaryResult {
    docid: MetaId
    summaryid: MetaId
}
