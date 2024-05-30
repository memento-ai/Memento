// Path: packages/function-calling/src/functions/queryMementoView.ts

import { baseInputSchema, ErrorMessage } from '../functionRegistry';
import { count_tokens } from '@memento-ai/encoding';
import { raw } from 'slonik-sql-tag-raw';
import { sql } from 'slonik';
import { stripCommonIndent } from '@memento-ai/utils';
import { z } from 'zod';
import debug from 'debug';
import type {  FunctionConfig } from '../functionRegistry';
const dlog = debug('queryMementoView');

const inputSchema = baseInputSchema.extend({
    query: z.string().describe('The SQL query to execute.'),
}).describe('A read-only query to execute on the memento view.');
export type queryMementoViewInput = z.infer<typeof inputSchema>;

const Row = z.union([z.string(), z.number()]);
export type Row = z.infer<typeof Row>;

const Rows = z.array(Row);
export type Rows = z.infer<typeof Rows>;

export const RowsOrError = z.union([Rows, ErrorMessage]);
export type RowsOrError = z.infer<typeof RowsOrError>;

const outputSchema = z.promise(RowsOrError).describe('The result as a array of rows, or an error message.');
const fnSchema = z.function().args(inputSchema).returns(outputSchema)
    .describe('Execute a SQL SELECT query on the memento view.');

async function queryMementoView(input: queryMementoViewInput): Promise<RowsOrError> {
    dlog('queryMementoView:', input);
    let { query, context } = input;

    // If either of these errors happen, we should throw, as these are not errors that the LLM can attempt to correct.
    if (!context) {
        throw new Error('Context is required');
    }
    const { readonlyPool } = context;
    if (!readonlyPool) {
        throw new Error('readonlyPool is required');
    }

    try {
        const sqlFragment = raw(query, []);
        const result = await readonlyPool.query(sql.unsafe`${sqlFragment}`);
        dlog('Result:', result);
        if (result && result.rows && Array.isArray(result.rows)) {
            const tokens = result.rows.reduce((row: any) => {
                return count_tokens(Bun.inspect(row));
            }, 0);
            const max_query_result_tokens = 4000;
            if (tokens > max_query_result_tokens) {
                return { error: stripCommonIndent(`
                    Query result has ${tokens} tokens, which is more than the maximum of ${max_query_result_tokens}.
                    Please narrow your query to return fewer tokens.
                `) };
            } else if (tokens > max_query_result_tokens/2) {
                dlog(`Query result has ${tokens} tokens, which is more than half the maximum of ${max_query_result_tokens}`);
            }
        }
        return result.rows;
    }
    catch (error) {
        dlog('Error executing query:', error);
        return { error: (error as Error).message };
    }
};

export const QueryMementoView = z.object({
    name: z.literal('queryMementoView'),
    inputSchema,
    outputSchema,
    fnSchema
});

export const config: FunctionConfig<queryMementoViewInput, RowsOrError> = {
    name: 'queryMementoView',
    inputSchema,
    outputSchema,
    fnSchema,
    fn: queryMementoView,
};

export default config;
