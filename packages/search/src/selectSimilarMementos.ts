// Path: packages/search/src/selectSimilarMementos.ts

import { DOC, SYN, CONV } from '@memento-ai/types';
import { linearNormalize } from './normalize';
import { selectMemsByKeywordSearch } from './selectMemsByKeywordSearch';
import { selectMemsBySemanticSimilarity } from './selectMemsBySemanticSimilarity';
import debug from 'debug';
import type { DatabasePool } from 'slonik';
import type { MementoSearchResult,  MementoSearchArgs } from './mementoSearchTypes';

const dlog = debug('search');

// Return a list of mementos that are similar to the given content.
// The similarity is a combination of keyword search and semantic similarity.
// The result is sorted by the combined score in descending order.
// Both searches are limited to maxTokens tokens.
// The union will of the two searches will also be limited to maxTokens tokens.

export type MementoSimilarityMap = Record<string, MementoSearchResult>;

function trimResult(result: MementoSearchResult[], idSet: Set<string>, maxTokens: number): MementoSearchResult[] {
    let tokens = result.reduce((acc, m) => acc + m.tokens, 0);
    if (tokens <= maxTokens) {
        return result;
    }

    result = result.filter((m: MementoSearchResult) => {
        if (m.kind===DOC || m.kind===SYN || m.kind===CONV) {
            return !m.docid || !idSet.has(m.docid);
        } else {
            return true;
        }
    });

    let afterTokens = result.reduce((acc, m) => acc + m.tokens, 0);
    dlog(`Redundant mementos: removed ${tokens - afterTokens} tokens`);
    tokens = afterTokens;
    if (tokens <= maxTokens) {
        return result;
    }

    result.sort((a, b) => b.score - a.score);

    tokens = 0;
    for (let i = 0; i < result.length; i++) {
        if (tokens + result[i].tokens> maxTokens) {
            result = result.slice(0, i);
            break;
        }
        tokens += result[i].tokens;
    }

    dlog(`Combined tokens after filtering: ${tokens}`);
    return result;
}

export type CombineMementoResultArgs = {
    lhs: MementoSearchResult[];
    rhs: MementoSearchResult[];
    maxTokens: number;
    p?: number;
}

// Combine the results of two memento searches lhs and rhs into a single search result list.
// Some mementos may be in one selection but not the other. When this happens, the missing score is treated as zero.
// The combined score can be a weighted sum using weight p, which defaults to 0.5.
// The input lists lhs and rhs can be any valid MementoSearchResult array, including the output of this function.

export function combineMementoResults(args: CombineMementoResultArgs): MementoSearchResult[] {
    // If one of the lists is empty, return the other list.
    if (!args.lhs.length) {
        return args.rhs;
    } else if (!args.rhs.length) {
        return args.lhs;
    }

    const { lhs, rhs, maxTokens, p=0.5 } = args;

    let combined: MementoSearchResult[] = [];
    let lhsMap: Record<string, MementoSearchResult> = {};
    let rhsMap: Record<string, MementoSearchResult> = {};

    let idSet: Set<string> = new Set<string>();
    for (let m of lhs) {
        idSet.add(m.id);
        lhsMap[m.id] = m;
    }
    for (let m of rhs) {
        idSet.add(m.id);
        rhsMap[m.id] = m;
    }
    for (let id of idSet) {
        let lhsScore = id in lhsMap ? lhsMap[id].score : 0;
        let rhsScore = id in rhsMap ? rhsMap[id].score : 0;
        let entry = lhsMap[id] ?? rhsMap[id];
        let score = lhsScore*p + rhsScore*(1-p) ;
        combined.push({...entry, score});
    }

    combined = trimResult(combined, idSet, maxTokens);
    combined = linearNormalize(combined, (m) => m.score);
    return combined;
}

export async function selectSimilarMementos(dbPool: DatabasePool, args: MementoSearchArgs): Promise<MementoSearchResult[]> {
    const { content, maxTokens=5000, numKeywords=5 } = args;
    let keywordSelection: MementoSearchResult[] = await selectMemsByKeywordSearch(dbPool, {content, maxTokens, numKeywords});
    let similaritySelection: MementoSearchResult[] = await selectMemsBySemanticSimilarity(dbPool, {content, maxTokens});
    return combineMementoResults({lhs: keywordSelection, rhs: similaritySelection, maxTokens, p: 0.5});
}

export async function asSimilarityMap(searchResults: MementoSearchResult[]): Promise<MementoSimilarityMap> {
    let map: MementoSimilarityMap = {};
    for (let m of searchResults) {
        map[m.id] = m;
    }
    return map;
}
