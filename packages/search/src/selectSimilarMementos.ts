// Path: packages/search/src/selectSimilarMementos.ts

import { selectMemsByKeywordSearch } from './selectMemsByKeywordSearch';
import { selectMemsBySemanticSimilarity } from './selectMemsBySemanticSimilarity';
import type { DatabasePool } from 'slonik';
import type { MementoSearchResult,  MementoSearchArgs } from './mementoSearchTypes';
import { combineSearchResults } from './combineSearchResults';

// Return a list of mementos that are similar to the given content.
// The similarity is a combination of keyword search and semantic similarity.
// The result is sorted by the combined score in descending order.
// Both searches are limited to maxTokens tokens.
// However, the combined result may (and usually will) exceed maxTokens.
// The result should then be trimmed with the trimSearchResult function.
// We do not trim the result here but rather leave it to the caller to decide when to trim.
export async function selectSimilarMementos(dbPool: DatabasePool, args: MementoSearchArgs): Promise<MementoSearchResult[]> {
    const { content, maxTokens=5000, numKeywords=5 } = args;
    const keywordSelection: MementoSearchResult[] = await selectMemsByKeywordSearch(dbPool, {content, maxTokens, numKeywords});
    const similaritySelection: MementoSearchResult[] = await selectMemsBySemanticSimilarity(dbPool, {content, maxTokens});
    return combineSearchResults({lhs: keywordSelection, rhs: similaritySelection, maxTokens, p: 0.5});
}
