
import type { DatabasePool } from 'slonik';
import type { MementoSearchResult,  MementoSearchArgs } from './mementoSearchTypes';
import { selectMemsByKeywordSearch } from './selectMemsByKeywordSearch';
import { selectMemsBySemanticSimilarity } from './selectMemsBySemanticSimilarity';

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
    let idSet: Set<string> = new Set<string>();
    let kMap: Record<string, MementoSearchResult> = {};
    let sMap: Record<string, MementoSearchResult> = {};

    let kScoreSum = keywordSelection.reduce((acc, m) => acc + m.score, 0);
    let sScoreSum = similaritySelection.reduce((acc, m) => acc + m.score, 0);

    console.log(`Keyword score sum: ${kScoreSum}`);
    console.log(`Similarity score sum: ${sScoreSum}`);

    let kTokenSum = keywordSelection.reduce((acc, m) => acc + m.tokens, 0);
    let sTokenSum = similaritySelection.reduce((acc, m) => acc + m.tokens, 0);

    console.log(`Keyword token sum: ${kTokenSum}`);
    console.log(`Similarity token sum: ${sTokenSum}`);

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

    result.sort((a, b) => b.score - a.score);

    let tokens = 0;
    for (let i = 0; i < result.length; i++) {
        if (tokens + result[i].tokens> maxTokens) {
            result = result.slice(0, i);
            break;
        }
        tokens += result[i].tokens;
    }

    console.log(`Combined tokens: ${tokens}`);

    return result;
}
