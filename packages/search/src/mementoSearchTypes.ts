// Path: packages/search/src/mementoSearchTypes.ts

import { Mem, MemBaseMetaData } from '@memento-ai/types'
import { z } from 'zod'

export type MementoSearchArgs = {
    content: string
    numKeywords?: number
    maxTokens?: number
}

export const MementoSearchResult = MemBaseMetaData.pick({
    id: true,
    kind: true,
    docid: true,
    summaryid: true,
    source: true,
    created_at: true,

    // metaid: false,
    // role: false,
    // priority: false,
    // pinned: false,
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
