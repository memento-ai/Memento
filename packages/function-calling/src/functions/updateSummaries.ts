// Path: packages/function-calling/src/functions/updateSummaries.ts

import { baseInputSchema, type FunctionConfig, ID } from '../functionRegistry';
import { insertMem, insertMeta } from '@memento-ai/postgres-db';
import { CSUM, ConvSummaryMetaArgs, Mem, MetaId, createMem } from '@memento-ai/types';
import { sql } from 'slonik';
import { z } from 'zod';
import debug from 'debug';
import { zodParse } from '@memento-ai/utils';

const dlog = debug("updateSummaries");

export const UpdateOneSummaryInputSchema = z.object({
    metaId: MetaId,
    content: z.string().optional().describe('The new content for the conversation summary. Omit if only changing pinned or priority.'),
    pinned: z.boolean().optional().describe('Whether the conversation summary is pinned'),
    priority: z.number().optional().describe('The priority of the conversation summary'),
}).describe('Update or create one conversation summary');
export type UpdateOneSummaryInput = z.input<typeof UpdateOneSummaryInputSchema>;

export const MultipleSummaryUpdatesInputSchema = z.array(UpdateOneSummaryInputSchema)
    .describe('An array of UpdateOneSummaryInput objects');
export type MultipleSummaryUpdatesInput = z.input<typeof MultipleSummaryUpdatesInputSchema>;

const inputSchema = baseInputSchema.extend({
    updates: MultipleSummaryUpdatesInputSchema,
}).describe('The input for updateSummaries');
export type UpdateSummariesInput = z.input<typeof inputSchema>;

const outputSchema = z.promise(z.array(ID)).describe('An array of metaIds for the updated conversation summaries.');

const fnSchema = z.function().args(inputSchema).returns(outputSchema)
    .describe('Updates or inserts one or more conversation summaries.');

async function updateSummaries(input: UpdateSummariesInput): Promise<ID[]> {
    const { updates, context } = input;
    if (!context) {
        throw new Error('Context is required');
    }
    const pool = context.pool;
    if (!pool) {
        throw new Error('Pool is required');
    }

    let ids: ID[] = [];
    for await (const update of updates) {
        let metaId: MetaId;
        let content: string | undefined;
        let pinned: boolean | undefined;
        let priority: number | undefined;
        let mem: Mem
        try {
            let tobe = zodParse(UpdateOneSummaryInputSchema, update);
            if (content===undefined || pinned===undefined || priority===undefined) {
                if (!tobe.metaId) {
                    throw new Error('metaId is required');
                }
                if (tobe.metaId.length > 21) {
                    console.warn(`metaId ${tobe.metaId} is longer than 21 characters`);
                    tobe.metaId = tobe.metaId.slice(0, 21);
                }
                const result = await pool.query(sql.unsafe`
                    SELECT content, pinned, priority
                    FROM memento
                    WHERE id = ${tobe.metaId};`);
                if (result.rowCount === 1) {
                    const current = result.rows[0];
                    tobe = { ...current, ...tobe };
                }
            }
            ({ metaId, content, pinned, priority } = tobe);
            mem = await createMem(content as string);
            await insertMem(pool, mem);
        } catch (error) {
            console.error(Bun.inspect(update));
            throw new Error(`Error creating conversation summary mem: ${(error as Error).message}`);
        }
        let metaArgs: ConvSummaryMetaArgs;
        try {
            const kind = CSUM;
            metaArgs = zodParse(ConvSummaryMetaArgs, { metaId, kind, pinned, priority });
        } catch (error) {
            throw new Error(`Error parsing conversation summary meta args: ${(error as Error).message}`);
        }
        try {
            const { id: memId } = mem;
            ids = ids.concat(await insertMeta(pool, memId, metaId, metaArgs));
        } catch (error) {
            throw new Error(`Error upserting conversation summary: ${(error as Error).message}`);
        }
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

const config: FunctionConfig<UpdateSummariesInput, ID[]> = {
    name: 'updateSummaries',
    async: z.boolean().describe('Whether the function should be executed asynchronously'),
    inputSchema,
    outputSchema,
    fnSchema,
    fn: updateSummaries,
    extraTypes: { "UpdateOneSummaryInput": UpdateOneSummaryInputSchema }
};

export default config;
