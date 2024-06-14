// Path: packages/search/src/trimSearchResult.ts

import { CONV, DOC, DSUM, SYN } from "@memento-ai/types";
import type { MementoSearchResult } from "./mementoSearchTypes";
import debug from "debug";

const dlog = debug('search');

export function trimSearchResult(result: MementoSearchResult[], maxTokens: number): MementoSearchResult[] {
    let tokens = result.reduce((acc, m) => acc + m.tokens, 0);
    if (tokens <= maxTokens) {
        return result;
    }

    const idSet: Set<string> = new Set<string>();
    for (let m of result) {
        idSet.add(m.id);
    }

    // Remove redundant mementos. If a memento has a docid, and that docid is also in the result set, then then
    // referenced docid memento is preferred, and this memento can be removed.
    // This applies to DSUM, SYN, and CONV mementos.
    // DSUM are summaries of DOC.
    // SYN are synonyms of XCHG.
    // CONV content are contained in XCHG.
    result = result.filter((m: MementoSearchResult) => {
        if (m.kind===DSUM || m.kind===SYN || m.kind===CONV) {
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

    console.log(`Combined tokens after filtering: ${tokens}`, dlog.enabled);
    dlog(`Combined tokens after filtering: ${tokens}`);
    return result;
}
