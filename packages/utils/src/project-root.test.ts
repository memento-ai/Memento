// Path: packages/utils/src/project-root.test.ts

import { expect, describe, it } from "bun:test";
import { getProjectRoot } from './project-root';
import path from 'node:path';

describe('getProjectRoot', () => {
    it('should return the root of the project', () => {
        const root = getProjectRoot();
        const name = path.basename(root);
        expect(name).toBe('Memento');
    });
});
