// Path: packages/function-calling/src/functions/updateSummaries.ts

import { baseInputSchema, type FunctionConfig, ID, type Function, ErrorMessage } from '../functionRegistry';
import { handleInsertNewCsumRequest, handleUpdateExistingCsumRequest, CsumMetaData } from './updateSummaries-helper';
import { MetaId } from '@memento-ai/types';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import { zodParse } from '@memento-ai/utils';
import debug from 'debug';

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
