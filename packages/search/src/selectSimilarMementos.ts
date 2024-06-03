// Path: packages/search/src/selectSimilarMementos.ts

import type { DatabasePool } from 'slonik';
import type { MementoSearchResult,  MementoSearchArgs } from './mementoSearchTypes';
import { selectMemsByKeywordSearch } from './selectMemsByKeywordSearch';
import { selectMemsBySemanticSimilarity } from './selectMemsBySemanticSimilarity';
import { DOC, SYN, CONV } from '@memento-ai/types';
import { linearNormalize, normalize, softmaxNormalize } from './normalize';
import debug from 'debug';

const dlog = debug('search');

// Return a list of mementos that are similar to the given content.
// The similarity is a combination of keyword search and semantic similarity.
// The result is sorted by the combined score in descending order.
// Both searches are limited to maxTokens tokens.
// The union will of the two searches will also be limited to maxTokens tokens.

export async function selectSimilarMementos(dbPool: DatabasePool, args: MementoSearchArgs): Promise<MementoSearchResult[]> {
    const { content, maxTokens=5000, numKeywords=5 } = args;

    let keywordSelection: MementoSearchResult[] = await selectMemsByKeywordSearch(dbPool, {content, maxTokens, numKeywords});
    let similaritySelection: MementoSearchResult[] = await selectMemsBySemanticSimilarity(dbPool, {content, maxTokens});

    // We need to make a new MementoSearchResult[] that contains the union of the two selections,
    // but with the score being some kind of combination of the two scores.
    // Both scores are in the range [0, 1].

    // However, even though the theoretical range is [0, 1], in practice the cosign distance function used by semantic search
    // makes better of of the 0..1 range than the ts_rank score.

    // So, in both search functions, we normalize the scores to be in the range [0, 1] and to sum to 1.0 using softmaxNormalize.

    // Some mementos may be in one selection but not the other. When this happens, the missing score is treated as zero.
    // i.e. the probability of the memento being in the selection is zero.
    // The combined score is the arithmetic mean of the two scores.

    let result: MementoSearchResult[] = [];
    let kMap: Record<string, MementoSearchResult> = {};
    let sMap: Record<string, MementoSearchResult> = {};

    let kScoreSum = keywordSelection.reduce((acc, m) => acc + m.score, 0);
    let sScoreSum = similaritySelection.reduce((acc, m) => acc + m.score, 0);

    dlog(`Keyword score sum: ${kScoreSum}`);
    dlog(`Similarity score sum: ${sScoreSum}`);

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
    let idArray: string[] = Array.from(idSet);
    for (let id of idArray) {
        let kScore = kMap[id] ? kMap[id].score : 0;
        let sScore = sMap[id] ? sMap[id].score : 0;
        let entry = kMap[id] ?? sMap[id];
        let score = (kScore + sScore) / 2;
        result.push({...entry, score});
    }

    let tokens = result.reduce((acc, m) => acc + m.tokens, 0);
    if (tokens <= maxTokens) {
        return result;
    }
    dlog(`Combined tokens at start: ${tokens}`);

    // We need to trim the result to maxTokens tokens.
    // The first step should be to remove redundant mementos.
    // Each of the three kinds 'dsum', 'conv', 'syn' has a `docid` field which is the id of the "source memento",
    // i.e. these three kinds are "derived" from or contained within a "source" memento.

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

    // We stil have too many tokens, so we need to trim the result to maxTokens tokens.
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

    // Finally, let's renormalize the scores to sum to 1.0, using the simple normalize function (not softmax).
    return linearNormalize(result, (m) => m.score);
}
