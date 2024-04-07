// File: src/lib/functions/gitListFiles.ts

import { z } from 'zod';
import { baseInputSchema } from '../functionRegistry';
import type { FunctionConfig } from '../functionRegistry';
import { $ } from "bun";

const inputSchema = baseInputSchema.extend({}).describe('No input required');
export type GitListFilesInput = z.infer<typeof inputSchema>;

const outputSchema = z.promise(z.array(z.string())).describe('Array of file paths');
export type GitListFilesOutput = z.infer<typeof outputSchema>;

const fnSchema = z.function().args(inputSchema).returns(outputSchema)
    .describe('Returns list of file paths tracked by git for the current repository.');

async function gitListFiles(_: GitListFilesInput): Promise<string[]> {
    try {
        const { stdout, stderr, exitCode } = await $`git ls-files`.quiet();
        if (exitCode !== 0) {
          throw new Error(stderr.toString());
        }
        const filePaths = stdout.toString().trim().split('\n');
        return filePaths;
    } catch (error) {
        return [`Error listing file paths: ${(error as Error).message}`];
    }
}

export const config: FunctionConfig<GitListFilesInput, string[]> = {
    name: 'gitListFiles',
    inputSchema,
    outputSchema,
    fnSchema,
    fn: gitListFiles,
};

export default config;
