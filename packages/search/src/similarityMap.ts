// Path: packages/search/src/similarityMap.ts

import type { MementoSearchResult } from "./mementoSearchTypes";

export type MementoSimilarityMap = Record<string, MementoSearchResult>;

export async function asSimilarityMap(searchResults: MementoSearchResult[]): Promise<MementoSimilarityMap> {
    let map: MementoSimilarityMap = {};
    for (let m of searchResults) {
        map[m.id] = m;
    }
    return map;
}
