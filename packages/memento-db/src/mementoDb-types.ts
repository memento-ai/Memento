// Path: packages/memento-db/src/mementoDb-types.ts
import { type Role } from '@memento-ai/types';
import { z } from 'zod';
import debug from 'debug';

export const Context = z.object({
    readonlyPool: z.any(),
    pool: z.any()
});
export type Context = z.infer<typeof Context>;

const dlog = debug("mementoDb:types");

export type AddResponse = {
    error: string;
}

// The Add*Args types below are closely related to the *MemArgs types defined in mementoSchema,
// and possibly should be the same type.

export type AddConvArgs = {
    content: string;
    role: Role;
    priority?: number;
}

export type AddSysArgs = {
    content: string;
    priority: number;
}

export type AddFragArgs = {
    content: string;
    docId: string;
}

export type AddDocAndSummaryArgs = {
    source: string;
    content: string;
    summary: string
}

export type AddConvSummaryArgs = {
    metaId: string;
    content: string;
    pinned?: boolean;
    priority?: number;
}

export type AddSynopsisArgs = {
    content: string;
}

export const SimilarityResult = z.object({
    id: z.string(),
    kind: z.string(),
    content: z.string(),
    source: z.string(),
    created_at: z.number(),
    tokens: z.number(),
    similarity: z.number(),
});
export type SimilarityResult = z.TypeOf<typeof SimilarityResult>;

export interface DocAndSummaryResult {
    docId: string;
    summaryId: string;
}
