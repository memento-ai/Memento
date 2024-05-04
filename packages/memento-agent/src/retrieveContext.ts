// Path: packages/memento-agent/src/retrieveContext.ts

import type { SimilarityResult } from "@memento-ai/memento-db";
import type { Memento } from "@memento-ai/types";
import { functionCallingInstructions } from "./dynamicPrompt";
import { mementoCoreSystemPrompt } from "./mementoCoreSystemPrompt";
import type { MementoPromptTemplateArgs } from "./mementoPromptTemplate";
import debug from "debug";
import type { MementoAgent } from "./mementoAgent";

const mlog = debug("mementoAgent:mem");

export async function retrieveContext(agent: MementoAgent): Promise<MementoPromptTemplateArgs> {
    const pinnedCsumMems: Memento[] = await agent.DB.searchPinnedCsumMems(agent.max_csum_tokens);
    const synopses: string[] = await agent.DB.getSynopses(agent.max_synopses_tokens);
    const selectedMems: SimilarityResult[] = await agent.DB.searchMemsBySimilarity(agent.lastUserMessage, agent.max_similarity_tokens);
    const totalTokens: number = selectedMems.reduce((acc, mem) => acc + mem.tokens, 0);
    const continuityResponseContent: string | null = agent.continuityResponseContent;
    const functions = functionCallingInstructions(agent.databaseSchema);

    mlog(`selectedMems results: length: ${selectedMems.length}, total tokens: ${totalTokens}`);

    return {
        system: mementoCoreSystemPrompt,
        functions,
        databaseSchema: agent.databaseSchema,
        pinnedCsumMems,
        synopses,
        selectedMems,
        continuityResponseContent
    };
}
