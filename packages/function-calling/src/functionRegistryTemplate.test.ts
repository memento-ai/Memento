// Path: packages/function-calling/src/functionRegistryTemplate_test.ts

import { describe, it, expect } from 'bun:test';
import { registry } from './functions/index';
import { generateFunctionDescription } from './functionRegistry';
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
});
