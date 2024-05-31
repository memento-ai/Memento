// Path: packages/function-calling/src/functions/updateSummaries.ts

import { baseInputSchema, type FunctionConfig, ID, type Function, ErrorMessage } from '../functionRegistry';
import { insertMem, insertMeta } from '@memento-ai/postgres-db';
import { CSUM, ConvSummaryMetaArgs, MetaId, createMem } from '@memento-ai/types';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import debug from 'debug';
import { zodParse } from '@memento-ai/utils';
import { checkCsumSimilarity, CsumSimilarity } from '@memento-ai/memento-db';

const dlog = debug("updateSummaries");

export const UpdateOneSummaryInputSchema = z.object({
    metaId: MetaId,
    content: z.string().optional().describe('The new content for the conversation summary. Omit if only changing pinned or priority.'),
    pinned: z.boolean().optional().default(true).describe('Whether the conversation summary is pinned'),
    priority: z.number().optional().default(1).describe('The priority of the conversation summary'),
}).describe('Update or create one conversation summary');
export type UpdateOneSummaryInput = z.infer<typeof UpdateOneSummaryInputSchema>;

export const MultipleSummaryUpdatesInputSchema = z.array(UpdateOneSummaryInputSchema)
    .describe('An array of UpdateOneSummaryInput objects');
export type MultipleSummaryUpdatesInput = z.infer<typeof MultipleSummaryUpdatesInputSchema>;

const inputSchema = baseInputSchema.extend({
    updates: MultipleSummaryUpdatesInputSchema,
}).describe('The input for updateSummaries');
export type UpdateSummariesInput = z.infer<typeof inputSchema>;

export const IDorError = z.union([ID, ErrorMessage]);
export type IDorError = z.infer<typeof IDorError>;

const outputSchema = z.promise(z.array(IDorError)).describe('An array of Errors or metaIds for the updated conversation summaries.');

const fnSchema = z.function().args(inputSchema).returns(outputSchema)
    .describe('Updates or inserts one or more conversation summaries.');

const CsumMetaData = z.object({
    metaid: z.string(),
    memid: z.string(),
    content: z.string(),
    pinned: z.boolean(),
    priority: z.number(),
});
type CsumMetaData = z.infer<typeof CsumMetaData>;

async function handleInsertNewCsumRequest(pool: DatabasePool, request: UpdateOneSummaryInput): Promise<IDorError> {
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

async function handleUpdateExistingCsumRequest(pool: DatabasePool, request: UpdateOneSummaryInput, current: CsumMetaData): Promise<IDorError> {
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

async function updateSummaries(input: UpdateSummariesInput): Promise<IDorError[]> {
    const { updates, context } = input;
    if (!context) {
        throw new Error('Context is required');
    }
    const pool = context.pool as DatabasePool;
    if (!pool) {
        throw new Error('Pool is required');
    }

    if (updates.length > 3) {
        return [{ error: 'Requesting too many updates. Maximum of 3 updates at a time.' }];
    }

    let ids: IDorError[] = [];
    for await (const update of updates) {
        const request = zodParse(UpdateOneSummaryInputSchema, update);

        const query = sql.type(CsumMetaData)`
            SELECT
                id as metaId, memid, content, pinned, priority
            FROM memento
            WHERE id = ${request.metaId};`

        const current = await pool.query(query);
        let resultID: IDorError;
        if (current.rows.length === 0) {
            resultID = await handleInsertNewCsumRequest(pool, request);
        } else {
            dlog('request', request)
            dlog('current', current.rows[0]);
            resultID = await handleUpdateExistingCsumRequest(pool, request, current.rows[0]);
        }

        ids.push(resultID);
    }
    dlog(ids);
    return ids;
}

export const UpdateSummaries = z.object({
    name: z.literal('updateSummaries'),
    inputSchema,
    outputSchema,
    fnSchema
});

const config: FunctionConfig<UpdateSummariesInput, IDorError[]> = {
    name: 'updateSummaries',
    async: z.boolean().describe('Whether the function should be executed asynchronously'),
    inputSchema: inputSchema as z.ZodSchema<UpdateSummariesInput>,
    outputSchema,
    fnSchema: fnSchema as z.ZodSchema<Function<UpdateSummariesInput, ID[]>>,
    fn: updateSummaries,
    extraTypes: { "UpdateOneSummaryInput": UpdateOneSummaryInputSchema }
};

export default config;
