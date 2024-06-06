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

export async function selectSimilarMementos(dbPool: DatabasePool, args: MementoSearchArgs): Promise<MementoSimilarityMap> {
    const { content, maxTokens=5000, numKeywords=5 } = args;

    dlog(`Selecting maximum of ${maxTokens} tokens.`)

    let keywordSelection: MementoSearchResult[] = await selectMemsByKeywordSearch(dbPool, {content, maxTokens, numKeywords});
    let similaritySelection: MementoSearchResult[] = await selectMemsBySemanticSimilarity(dbPool, {content, maxTokens});

    // We need to make a new MementoSearchResult[] that contains the union of the two selections,
    // but with the score being some kind of combination of the two scores.
    // We achieve that easily given that both scores are already normalized to be in the full range of [0, 1].

    // Some mementos may be in one selection but not the other. When this happens, the missing score is treated as zero.
    // The combined score is simply the arithmetic mean of the two scores.

    let combined: MementoSearchResult[] = [];
    let kMap: Record<string, MementoSearchResult> = {};
    let sMap: Record<string, MementoSearchResult> = {};

    let kTokenSum = keywordSelection.reduce((acc, m) => acc + m.tokens, 0);
    let sTokenSum = similaritySelection.reduce((acc, m) => acc + m.tokens, 0);

    dlog(`Keyword token sum: ${kTokenSum}`);
    dlog(`Similarity token sum: ${sTokenSum}`);

    let idSet: Set<string> = new Set<string>();
    for (let m of keywordSelection) {
        idSet.add(m.id);
        kMap[m.id] = m;
    }
    for (let m of similaritySelection) {
        idSet.add(m.id);
        sMap[m.id] = m;
    }
    for (let id of idSet) {
        let kScore = id in kMap ? kMap[id].score : 0;
        let sScore = id in sMap ? sMap[id].score : 0;
        let entry = kMap[id] ?? sMap[id];
        let score = (kScore + sScore) / 2;
        combined.push({...entry, score});
    }

    combined = trimResult(combined, idSet, maxTokens);
    combined = linearNormalize(combined, (m) => m.score);

    let result: Record<string, MementoSearchResult> = {};
    for (let m of combined) {
        result[m.id] = m;
    }

    return result;
}
