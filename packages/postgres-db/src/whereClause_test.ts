import { expect, describe, it, beforeAll } from "bun:test";

import { generateWhereClause, type Condition, type LogicalOperation, getWhereClauseExamples } from './whereClause';
import { USER } from "@memento-ai/types";
import { Glob } from 'bun';

describe('generateWhereClause', () => {

    it ('should generate an empty whereClause', () => {
        const whereClause = {};
        const result = generateWhereClause(whereClause);
        expect(result.sql).toBe('');
        expect(result.values).toEqual([]);
    });

    it('should generate a simple equality whereClause', () => {
        const whereClause: Condition = {
        column: 'age',
        operator: '=',
        value: 25,
        };

        const result = generateWhereClause(whereClause);

        expect(result.sql).toBe('WHERE "age" = $slonik_1');
        expect(result.values).toEqual([25]);
    });

    it.todo('should generate a simple equality whereClause using tsvector', () => {
        const whereClause: Condition = {
            column: 'tssearch',
            operator: '@@',
            value: 'test',
        };

        const result = generateWhereClause(whereClause);

        expect(result.sql).toBe('WHERE "tssearch" @@ $slonik_1');
        expect(result.values).toEqual(['test']);
    });

    it('should generate a compound whereClause with AND', () => {
        const whereClause: LogicalOperation = {
        logicalOperator: 'AND',
        conditions: [
            {
            column: 'name',
            operator: '=',
            value: 'John',
            },
            {
            column: 'age',
            operator: '>',
            value: 30,
            },
        ],
        };

        const result = generateWhereClause(whereClause);

        expect(result.sql).toBe('WHERE ("name" = $slonik_1 AND "age" > $slonik_2)');
        expect(result.values).toEqual(['John', 30]);
    });

    it('should generate a compound whereClause with OR', () => {
        const whereClause = {
        logicalOperator: 'OR',
        conditions: [
            {
            column: 'name',
            operator: '=',
            value: 'John',
            },
            {
            column: 'age',
            operator: '>',
            value: 30,
            },
        ],
        };

        const result = generateWhereClause(whereClause);

        expect(result.sql).toBe('WHERE ("name" = $slonik_1 OR "age" > $slonik_2)');
        expect(result.values).toEqual(['John', 30]);
    });

    it('should generate a nested compound whereClause', () => {
        const whereClause = {
        logicalOperator: 'AND',
        conditions: [
            {
            logicalOperator: 'OR',
            conditions: [
                {
                column: 'name',
                operator: '=',
                value: 'John',
                },
                {
                column: 'age',
                operator: '>',
                value: 30,
                },
            ],
            },
            {
            column: 'city',
            operator: '=',
            value: 'New York',
            },
        ],
        };

        const result = generateWhereClause(whereClause);

        expect(result.sql).toBe('WHERE (("name" = $slonik_1 OR "age" > $slonik_2) AND "city" = $slonik_3)');
        expect(result.values).toEqual(['John', 30, 'New York']);
    });

    it('should generate a nested compound whereClause with multiple levels', () => {
        const whereClause = {
            logicalOperator: 'AND',
            conditions: [
                {
                    column: 'role',
                    operator: '=',
                    value: USER,
                },
                {
                    logicalOperator: 'OR',
                    conditions: [
                        {
                            column: 'priority',
                            operator: '=',
                            value: 10,
                        },
                        {
                            column: 'priority',
                            operator: '=',
                            value: 20,
                        }
                    ]
                }
            ]
        };
        const result = generateWhereClause(whereClause);
        expect(result.sql).toBe('WHERE ("role" = $slonik_1 AND ("priority" = $slonik_2 OR "priority" = $slonik_3))');
    });
});

describe('can generate a set of where clause examples from JSON files', () => {
    it('should generate a set of where clause examples', async () => {
        const examples = await getWhereClauseExamples();
        expect(examples).toBeTruthy();
        expect(examples.split('\n').length).toBeGreaterThan(10);
    });
});

describe('Can parse all example where clauses', () => {

    let examples: object[] = []

    const dir = import.meta.dir;
    const glob = new Glob(`**/*.json`);
    const examplesDir = `${dir}/whereClauseExamples`;

    beforeAll(async () => {
        for await (const f of glob.scanSync(examplesDir)) {
            if (glob.match(f))
            {
                const path: string = `${examplesDir}/${f}`;
                const file = Bun.file(path);
                const text = await file.text();
                const json = JSON.parse(text);
                examples.push(json);
            }
        }
    });

    it('should parse all example where clauses', () => {
        for (const whereClause of examples) {
            const result = generateWhereClause(whereClause);
            expect(result.sql).toBeTruthy();
        }
    });

})
