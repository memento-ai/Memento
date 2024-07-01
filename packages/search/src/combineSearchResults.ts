// Path: packages/search/src/combineSearchResults.ts

import type { MementoSearchResult } from './mementoSearchTypes'
import { linearNormalize } from './normalize'

export type CombineMementoResultArgs = {
    lhs: MementoSearchResult[]
    rhs: MementoSearchResult[]
    maxTokens: number
    p: number
}

// Combine the results of two memento searches lhs and rhs into a single search result list.
// Some mementos may be in one selection but not the other. When this happens, the missing score is treated as zero.
// The combined score can be a weighted sum using weight p, which defaults to 0.5.
// The input lists lhs and rhs can be any valid MementoSearchResult array, including the output of this function.

export function combineSearchResults(args: CombineMementoResultArgs): MementoSearchResult[] {
    // If one of the lists is empty, return the other list.
    if (!args.lhs.length) {
        return args.rhs
    } else if (!args.rhs.length) {
        return args.lhs
    }

    const { lhs, rhs, p } = args

    const combined: MementoSearchResult[] = []
    const lhsMap: Record<string, MementoSearchResult> = {}
    const rhsMap: Record<string, MementoSearchResult> = {}

    const idSet: Set<string> = new Set<string>()
    for (const m of lhs) {
        idSet.add(m.id)
        lhsMap[m.id] = m
    }
    for (const m of rhs) {
        idSet.add(m.id)
        rhsMap[m.id] = m
    }
    for (const id of idSet) {
        const lhsScore = id in lhsMap ? lhsMap[id].score : 0
        const rhsScore = id in rhsMap ? rhsMap[id].score : 0
        const entry = lhsMap[id] ?? rhsMap[id]
        const score = lhsScore * p + rhsScore * (1 - p)
        combined.push({ ...entry, score })
    }

    return linearNormalize(combined, (m) => m.score)
}
