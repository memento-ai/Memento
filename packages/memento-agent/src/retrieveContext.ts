// Path: packages/memento-agent/src/retrieveContext.ts

import { count_tokens } from "@memento-ai/encoding";
import { functionCallingInstructions } from "./dynamicPrompt";
import debug from "debug";
import type { ConvSummaryMemento, Memento } from "@memento-ai/types";
import type { MementoAgent } from "./mementoAgent";
import type { MementoPromptTemplateArgs } from "./mementoPromptTemplate";
import type { SimilarityResult } from "@memento-ai/memento-db";

const tlog = debug("usage:prompt");

type Item = string | string [] | Memento | Memento[] | SimilarityResult | SimilarityResult[] | null;

function tokens(content: Item): number {
    if (content === null) { return 0; }
    else if (Array.isArray(content)) { return content.reduce((acc, item) => acc + tokens(item), 0); }
    else if (typeof content === "string") { return count_tokens(content); }
    else if ("content" in content) { return count_tokens(content.content); }

    console.log("Unexpected content type", content);
    return 0;
}

export async function retrieveContext(agent: MementoAgent): Promise<MementoPromptTemplateArgs> {
    const pinnedCsumMems: ConvSummaryMemento[] = await agent.DB.searchPinnedCsumMems(agent.max_csum_tokens);
    const synopses: string[] = await agent.DB.getSynopses(agent.max_synopses_tokens);
    const selectedMems: SimilarityResult[] = await agent.DB.searchMemsBySimilarity(agent.lastUserMessage.content, agent.max_similarity_tokens);
    const continuityResponseContent: string | null = agent.continuityResponseContent;
    const functions = functionCallingInstructions(agent.databaseSchema);

    const retrievedContext = {
        functions,
        databaseSchema: agent.databaseSchema,
        pinnedCsumMems,
        synopses,
        selectedMems,
        continuityResponseContent
    };

    if (tlog.enabled) {
        const totals = Object.fromEntries(Object.entries(retrievedContext).map(([k, v]) => [k, tokens(v)]));
        tlog(`tokens: ${Bun.inspect(totals)}`);
    }

    return retrievedContext;
}
