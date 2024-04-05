// File: src/lib/functions/executeReadOnlyQuery.ts
import { z } from 'zod';
import { baseInputSchema, type FunctionConfig, ErrorMessage } from '../functionRegistry';
import { generateWhereClause, WhereClauseUnionSchema } from '@memento-ai/postgres-db';
import debug from 'debug';
import { sql } from 'slonik';

const dlog = debug('executeReadOnlyQuery');

const inputSchema = baseInputSchema.extend({
    columns: z.array(z.string()).describe('The columns to select from the memento view.'),
    distinct: z.boolean().optional().describe('Whether to apply DISTINCT to the query.'),
    whereClause: WhereClauseUnionSchema,
    limit: z.number().min(1).max(50).describe('The maximum number of rows to return.'),
}).describe('The options used to compose the query of the memento view.');
export type ExecuteReadOnlyQueryInput = z.infer<typeof inputSchema>;

const Row = z.union([z.string(), z.number()]);
export type Row = z.infer<typeof Row>;

const Rows = z.array(Row);
export type Rows = z.infer<typeof Rows>;

export const RowsOrError = z.union([Rows, ErrorMessage]);
export type RowsOrError = z.infer<typeof RowsOrError>;

const outputSchema = z.promise(RowsOrError).describe('The result as a array of rows, or an error message.');
const fnSchema = z.function().args(inputSchema).returns(outputSchema)
    .describe('Execute a SQL SELECT query on the memento view.');

async function executeReadOnlyQuery(input: ExecuteReadOnlyQueryInput): Promise<RowsOrError> {
    dlog('executeReadOnlyQuery:', input);
    let { columns, whereClause, limit, context } = input;

    limit = limit ?? 1;
    whereClause = whereClause ?? {};

    // If either of these errors happen, we should throw, as these are not errors that the LLM can attempt to correct.
    if (!context) {
        throw new Error('Context is required');
    }
    const { readonlyPool } = context;
    if (!readonlyPool) {
        throw new Error('readonlyPool is required');
    }

    let whereClauseFragment;
    try {
        whereClauseFragment = generateWhereClause(whereClause);
        dlog('whereClauseFragment:', whereClauseFragment.sql)
    } catch (error) {
        dlog('Error generating where clause:', error);
        return { error: (error as Error).message };
    }

    try {
        const query = sql.unsafe`
            SELECT ${input.distinct ? sql.fragment`DISTINCT ` : sql.fragment``}
                ${sql.join(columns.map(column => sql.identifier([column])), sql.fragment`, `)}
            FROM memento
            ${whereClauseFragment}
            LIMIT ${limit}
        `;
        const result = await readonlyPool.any(query);
        return result;
    }
    catch (error) {
        dlog('Error executing query:', error);
        return { error: (error as Error).message };
    }
};


export const discriminatedUnion = z.discriminatedUnion('name', [
    z.object({
      name: z.literal('executeReadOnlyQuery'),
      inputSchema,
      outputSchema,
      fnSchema
    }),
  ]);


export const config: FunctionConfig<ExecuteReadOnlyQueryInput, RowsOrError> = {
    name: 'executeReadOnlyQuery',
    inputSchema,
    outputSchema,
    fnSchema,
    fn: executeReadOnlyQuery,
};

export default config;
