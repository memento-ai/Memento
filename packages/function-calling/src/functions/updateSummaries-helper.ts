// Path: packages/function-calling/src/functions/updateSummaries-helper.ts

import { createMem, ConvSummaryMetaArgs, CSUM } from "@memento-ai/types";
import { CsumSimilarity, checkCsumSimilarity } from "@memento-ai/memento-db";
import { insertMem, insertMeta } from "@memento-ai/postgres-db";
import { zodParse } from "@memento-ai/utils";
import debug from 'debug';
import type { DatabasePool } from "slonik";
import type { ErrorMessage } from "../functionRegistry";
import type { UpdateOneSummaryInput, IDorError } from "./updateSummaries";
import { z } from "zod";

const dlog = debug("updateSummaries");

export const CsumMetaData = z.object({
    metaid: z.string(),
    memid: z.string(),
    content: z.string(),
    pinned: z.boolean(),
    priority: z.number(),
});
export type CsumMetaData = z.infer<typeof CsumMetaData>;

export async function handleInsertNewCsumRequest(pool: DatabasePool, request: UpdateOneSummaryInput): Promise<IDorError> {
    const { metaId, content, pinned, priority } = request;
    if (!content) {
        throw new Error('Content is required when creating new conversation summary');
    }
    // --- validate that the content is sufficiently unique here ---
    dlog('handleInsertNewCsumRequest calling checkCsumSimilarity with content:', content);
    const similarities: CsumSimilarity[] = await checkCsumSimilarity(pool, content);
    if (similarities.length > 0) {
        const error: ErrorMessage = {
            error: `Content for ${metaId} is too similar to existing conversation summary ${similarities[0].id} with content "${similarities[0].content}"`
        };
        return error;
    } else {
        dlog('No similar conversation summaries found');
    }
    const mem = await createMem(content);
    await insertMem(pool, mem);
    const metaArgs = zodParse(ConvSummaryMetaArgs, { metaId, kind: CSUM, pinned, priority });
    const result = await insertMeta(pool, mem.id, metaId, metaArgs);
    if (result.length !== 1) {
        throw new Error(`Unexpected result length: ${result.length}`);
    }
    return result[0];
}

export async function handleUpdateExistingCsumRequest(pool: DatabasePool, request: UpdateOneSummaryInput, current: CsumMetaData): Promise<IDorError> {
    if (request.metaId !== current.metaid) {
        dlog('request', request);
        dlog('current', current);
        throw new Error(`Shouldn't be possible: ${current.metaid} not same as ${request.metaId}`);
    }

    let reqMemId: string;
    if (!request.content) {
        // The request did not provide content, so we use the current content & mem record
        reqMemId = current.memid;
    } else {
        const reqMem = await createMem(request.content);
        await insertMem(pool, reqMem);
        reqMemId = reqMem.id;
    }

    const tobe = zodParse(ConvSummaryMetaArgs, { ...current, ...request, kind: CSUM});
    const result = await insertMeta(pool, reqMemId, request.metaId, tobe);
    if (result.length !== 1) {
        throw new Error(`Unexpected result length: ${result.length}`);
    }
    return result[0];
}
