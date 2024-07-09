// Path: packages/search/src/selectSimilarMementos.ts

import debug from 'debug'
import type { DatabasePool } from 'slonik'
import { combineSearchResults } from './combineSearchResults'
import { MementoSearchArgs, type MementoSearchResult } from './mementoSearchTypes'
import { selectMemsByKeywordSearch } from './selectMemsByKeywordSearch'
import { selectMemsBySemanticSimilarity } from './selectMemsBySemanticSimilarity'

const dlog = debug('selectSimilarMementos')

// Return a list of mementos that are similar to the given content.
// The similarity is a combination of keyword search and semantic similarity.
// The result is sorted by the combined score in descending order.
// Both searches are limited to max_tokens tokens.
// However, the combined result may (and usually will) exceed max_tokens.
// The result should then be trimmed with the trimSearchResult function.
// We do not trim the result here but rather leave it to the caller to decide when to trim.
export async function selectSimilarMementos(
    dbPool: DatabasePool,
    args: MementoSearchArgs
): Promise<MementoSearchResult[]> {
    const { content, max_tokens, keywords } = MementoSearchArgs.parse(args)
    dlog(`selectSimilarMementos: max_tokens:${max_tokens} keywords:${keywords} content: ${content.slice(0, 50)}...`)
    const keywordSelection: MementoSearchResult[] = await selectMemsByKeywordSearch(dbPool, {
        content,
        max_tokens,
        keywords,
    })
    const similaritySelection: MementoSearchResult[] = await selectMemsBySemanticSimilarity(dbPool, {
        content,
        max_tokens,
        keywords,
    })
    return combineSearchResults({ lhs: keywordSelection, rhs: similaritySelection, max_tokens, p: 0.5 })
}
