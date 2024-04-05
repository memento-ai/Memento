import { z } from 'zod';
import { sql, type FragmentSqlToken, type SqlFragment } from 'slonik';
import { Glob } from "bun";

export const BaseWhereClauseSchema = z.object({});

export const EmptyClauseSchema = BaseWhereClauseSchema.strict();
export type EmptyClause = z.infer<typeof EmptyClauseSchema>;

export const Scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type Scalar = z.infer<typeof Scalar>;

export const ScalarArray = z.array(Scalar);
export type ScalarArray = z.infer<typeof ScalarArray>;

export const ConditionSchema = BaseWhereClauseSchema.extend({
    column: z.string().describe('The column to apply the condition to.'),
    operator: z.enum([
        '=', '!=', '<', '<=', '>', '>=',
        'IS', 'IS NOT',
        'LIKE', 'ILIKE',
        '<=>',
        '@@'
    ]).describe('The boolean operator to use (e.g. `=`, `<`, ...)).'),
    value: z.union([Scalar, ScalarArray]).describe('The value to compare the column to.'),
}).describe('A simple condition to apply to a query.');
export type Condition = z.infer<typeof ConditionSchema>;

export const LogicalOperator = z.union([
    z.literal('AND'),
    z.literal('OR')
]).describe('The logical operator to use (e.g. `AND`, `OR`).');
export type LogicalOperator = z.infer<typeof LogicalOperator>;

export const WhereClauseList = z.array(BaseWhereClauseSchema).describe('A list of where clause subexpressions to apply to a query.');
export type WhereClauseList = z.infer<typeof WhereClauseList>;

export type LogicalOperation = z.infer<typeof BaseWhereClauseSchema> & {
    logicalOperator: LogicalOperator,
    conditions: WhereClauseList,
};

export const LogicalOperationSchema: z.ZodType<LogicalOperation> = BaseWhereClauseSchema.extend({
    logicalOperator: LogicalOperator,
    conditions: z.lazy(() => WhereClauseUnionSchema.array()),
}).describe('A logical operation to apply to a list of subexpressions.');

export const WhereClauseUnionSchema = z.union([
    EmptyClauseSchema,
    ConditionSchema,
    LogicalOperationSchema,
]).describe('A where clause that can be composed of simple conditions and logical operations on lists of where clause subexpressions. See details below.');
export type WhereClauseUnion = z.infer<typeof WhereClauseUnionSchema>;

export function generateWhereClause(condition: WhereClauseUnion): FragmentSqlToken {
    if (condition==null || EmptyClauseSchema.safeParse(condition).success) {
        return sql.fragment``;
    }

    const parsedCondition = WhereClauseUnionSchema.parse(condition);

    function generateFragment(cond: any): SqlFragment {
            if (ConditionSchema.safeParse(cond).success) {
                const { column, operator, value } = cond;
                if (operator === '@@') {
                    // const tsquery = sql.fragment`to_tsquery(${value})`;
                    // console.log(tsquery);
                    const tsquery_expr = sql.fragment`${sql.identifier([column])} ${sql.fragment(operator)} ${value}`;
                    console.log(tsquery_expr);
                    return tsquery_expr;
                } else if (operator === '<=>') {
                    return sql.fragment`${sql.identifier([column])} ${sql.fragment(operator)} ${value}`;
                } else {
                    return sql.fragment`${sql.identifier([column])} ${sql.fragment(operator)} ${value}`;
                }
            } else if (LogicalOperationSchema.safeParse(cond).success) {
                const { logicalOperator, conditions } = cond as LogicalOperation;
                const fragments: SqlFragment[] = conditions.map((c: WhereClauseUnion) => generateFragment(c));
                const operator: LogicalOperator = logicalOperator;
                const joinedFragments = sql.join(fragments, operator === 'AND' ? sql.fragment` AND ` : sql.fragment` OR `);
                return sql.fragment`(${joinedFragments})`;
            } else if (EmptyClauseSchema.safeParse(cond).success) {
                return sql.fragment``;
            } else {
                throw new Error("Invalid condition" + JSON.stringify(cond));
            }
    }

    return sql.fragment`WHERE ${generateFragment(parsedCondition)}`;
}

export async function getWhereClauseExamples() : Promise<string> {
    const dir = import.meta.dir;
    const glob = new Glob(`**/*.json`);
    const examplesDir = `${dir}/whereClauseExamples`;
    let examples: string[] = [];
    const exampleFiles = Array.from(glob.scanSync(examplesDir)).sort();

    for (const f of exampleFiles) {
        const path: string = `${examplesDir}/${f}`;
        const file = Bun.file(path);
        const text = await file.text();
        examples.push(`${path}:\n${text}`);
    }
    return examples.join('\n');
}
