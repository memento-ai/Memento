// src/lib/functionRegistry.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { registry } from './functions/index';
import { generateFunctionDescription, getRegistryDescription } from './functionRegistry';
import { MementoDb } from '@memento-ai/memento-db';
import { nanoid } from 'nanoid';
import { createMementoDb, dropDatabase } from '@memento-ai/postgres-db';
import { USER, ASSISTANT } from '@memento-ai/types';
import debug from 'debug';
import { getProjectRoot } from '@memento-ai/utils';

const dlog = debug('functionRegistry');

describe('generateFunctionDescription', () => {
    it('should generate a description for getCurrentTime', async () => {
        const testConfig = registry['getCurrentTime'];
        const description = generateFunctionDescription(testConfig);
        dlog(description);
        const expected = `
Function: getCurrentTime
    Purpose: Returns the current UTC time
    Input: No input required
        context: An optional context object. Leave unspecified -- Memento will provide.
    Output: ISO string`.trim();
        expect(description).toEqual(expected);
    });

    it('should generate all function descriptions', async () => {
        const descriptions = getRegistryDescription();
        dlog(descriptions);
        const expected = `
Available functions:

Function: executeReadOnlyQuery
    Purpose: Execute a SQL SELECT query on the memento view.
    Input: The options used to compose the query of the memento view.
        context: An optional context object. Leave unspecified -- Memento will provide.
        columns: The columns to select from the memento view.
        distinct: Whether to apply DISTINCT to the query.
        whereClause: A where clause that can be composed of simple conditions and logical operations on lists of where clause subexpressions. See details below.
        limit: The maximum number of rows to return.
    Output: The result as a array of rows, or an error message.

Function: getCurrentTime
    Purpose: Returns the current UTC time
    Input: No input required
        context: An optional context object. Leave unspecified -- Memento will provide.
    Output: ISO string

Function: gitListFiles
    Purpose: Returns list of file paths tracked by git for the current repository.
    Input: No input required
        context: An optional context object. Leave unspecified -- Memento will provide.
    Output: Array of file paths

Function: readSourceFile
    Purpose: Read the content of a source file and return it as a single string.
    Input: The file path options
        context: An optional context object. Leave unspecified -- Memento will provide.
        filePath: The path to the source file to read.
    Output: The content of the source file as a single string.

    `.trim()

        const expectedLines = expected.split('\n');
        const descriptionsLines = descriptions.split('\n');
        expect(descriptionsLines).toEqual(expectedLines);
    });
});


describe('getCurrentTime', () => {
    it('should return the current time as an ISO 8601 formatted string', async () => {
      const getCurrentTime = registry['getCurrentTime'];
      expect(getCurrentTime).toBeDefined();
      const currentTime: string = await getCurrentTime.fn({});
      expect(typeof currentTime).toBe('string');
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(currentTime).toMatch(dateRegex);
    });
  });

describe('readSourceFile', () => {
    it('should read a source file by path', async () => {
        const projectRoot = getProjectRoot();
        const readSourceFile = registry['readSourceFile'];
        expect(readSourceFile).toBeDefined();
        const content: string = await readSourceFile.fn({
            filePath: `${projectRoot}/packages/function-calling/src/functions/getCurrentTime.ts`
        });
        expect(typeof content).toBe('string');
        expect(content).toContain("File: packages/function-calling/src/functions/getCurrentTime.ts");
    });
});

describe('gitListFiles', () => {
    it('should list tracked git files', async () => {
        const gitListFiles = registry['gitListFiles'];
        expect(gitListFiles).toBeDefined();
        const content: string[] = await gitListFiles.fn({});
        expect(content).toContain("packages/function-calling/src/functions/getCurrentTime.ts");
        expect(content).toContain("packages/types/src/mementoSchema.ts");
    });
});

describe('executeReadOnlyQuery', () => {
    let db: MementoDb;
    let dbname: string;
    beforeAll(async () => {
        dbname = `test_${nanoid()}`;
        await createMementoDb(dbname);
        dlog(`Created database ${dbname}`);

        db = await MementoDb.create(dbname);
        expect(db).toBeTruthy();
        expect(db.name).toBe(dbname);
        expect(db.pool).toBeTruthy();

        const id = await db.addConversationMem({content: "test conversation mem", role: USER});
        expect(id).toBeTruthy();
        dlog(`Added conversation mem to ${dbname} with id ${id}`);

        const id2 = await db.addConversationMem({content: "another test conversation mem", role: USER});
        expect(id2).toBeTruthy();
        dlog(`Added conversation mem to ${dbname} with id ${id2}`);
    });

    afterAll(async () => {
        dlog(`Dropping database ${dbname}`);
        await db.close();
        await dropDatabase(dbname);
    });

    it('should execute a read-only SQL query on the knowledge base', async () => {
        const executeReadOnlyQuery = registry['executeReadOnlyQuery'];
        expect(executeReadOnlyQuery).toBeDefined();
        dlog(`Executing read-only query on ${dbname}`);
        const result = await executeReadOnlyQuery.fn({
            columns: ['kind'],
            whereClause: {},
            limit: 5,
            context: { readonlyPool: db.readonlyPool },
        });
        expect(typeof result).toBe('object');
        expect(result.length).toBe(2);
    });

    it('should execute a read-only SQL query using DISTINCT on the knowledge base', async () => {
        const executeReadOnlyQuery = registry['executeReadOnlyQuery'];
        expect(executeReadOnlyQuery).toBeDefined();
        dlog(`Executing read-only query on ${dbname}`);
        const result = await executeReadOnlyQuery.fn({
            columns: ['kind'],
            distinct: true,
            whereClause: {},
            limit: 5,
            context: { readonlyPool: db.readonlyPool },
        });
        expect(typeof result).toBe('object');
        expect(result.length).toBe(1);
    });

    it('should execute a read-only SQL query with multiple conditions', async () => {
        const executeReadOnlyQuery = registry['executeReadOnlyQuery'];
        expect(executeReadOnlyQuery).toBeDefined();
        dlog(`Executing read-only query on ${dbname}`);

        // Add some test data with different roles and priorities
        await db.addConversationMem({content: "test mem 1", role: USER, priority: 10});
        await db.addConversationMem({content: "test mem 2", role: USER, priority: 20});
        await db.addConversationMem({content: "test mem 3", role: ASSISTANT, priority: 10});

        const result = await executeReadOnlyQuery.fn({
            columns: ['content'],
            whereClause: {
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
            },
            limit: 5,
            context: { readonlyPool: db.readonlyPool },
        });
        expect(typeof result).toBe('object');
        expect(result.length).toBe(2);
        expect(result).toContainEqual({ content: 'test mem 1' });
        expect(result).toContainEqual({ content: 'test mem 2' });
    });

    it('should return all matching rows when limit is higher than the number of matches', async () => {
        const executeReadOnlyQuery = registry['executeReadOnlyQuery'];
        expect(executeReadOnlyQuery).toBeDefined();
        dlog(`Executing read-only query on ${dbname}`);

        const result = await executeReadOnlyQuery.fn({
            columns: ['content'],
            whereClause: { column: 'role', operator: '=', value: USER },
            limit: 10,
            context: { readonlyPool: db.readonlyPool },
        });
        expect(typeof result).toBe('object');
        expect(result.length).toBe(4); // Assuming there are 4 USER entries in the test database
    });

    it('should return all rows when conditions array is empty', async () => {
        const executeReadOnlyQuery = registry['executeReadOnlyQuery'];
        expect(executeReadOnlyQuery).toBeDefined();
        dlog(`Executing read-only query on ${dbname}`);

        const result = await executeReadOnlyQuery.fn({
            columns: ['content'],
            whereClause: {},
            limit: 10,
            context: { readonlyPool: db.readonlyPool },
        });
        expect(typeof result).toBe('object');

        // We are currenty using one test database for all of these tests.
        // The tests will be fragile to other changes unless we switch to using a separate db per test.
        expect(result.length).toBeGreaterThanOrEqual(5); // Assuming there are 5 total entries in the test database
        expect(result.length).toBeLessThan(10); // Should be less than 10 total entries in the test database for this test.
    });
});
