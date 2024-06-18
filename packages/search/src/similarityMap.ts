// Path: packages/search/src/similarityMap.ts

import type { MementoSearchResult } from './mementoSearchTypes'

export type MementoSimilarityMap = Record<string, MementoSearchResult>

export async function asSimilarityMap(searchResults: MementoSearchResult[]): Promise<MementoSimilarityMap> {
    const map: MementoSimilarityMap = {}
    for (const m of searchResults) {
        map[m.id] = m
    }
    return map
}
