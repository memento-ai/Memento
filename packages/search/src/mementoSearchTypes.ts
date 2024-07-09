// Path: packages/search/src/mementoSearchTypes.ts

import { Mem, MemBaseMetaData } from '@memento-ai/types'
import { z } from 'zod'

export const MementoSearchArgs = z.object({
    content: z.string(),
    keywords: z.number().min(3),
    max_tokens: z.number().min(2000),
})
export type MementoSearchArgs = z.infer<typeof MementoSearchArgs>

export const MementoSearchResult = MemBaseMetaData.pick({
    id: true,
    kind: true,
    docid: true,
    summaryid: true,
    source: true,
    created_at: true,
})
    .merge(
        Mem.pick({
            content: true,
            tokens: true,

            // embed_vector: false,
            // tssearch: false,
        })
    )
    .extend({
        score: z.number(), // The score of the search result, either the rank or similarity.
    })
    .required({
        created_at: true,
    })
export type MementoSearchResult = z.infer<typeof MementoSearchResult>
