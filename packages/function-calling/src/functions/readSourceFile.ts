// Path: packages/function-calling/src/functions/readSourceFile.ts

import { z } from 'zod';
import { baseInputSchema, type FunctionConfig } from '../functionRegistry';
import fs from 'fs/promises';
import debug from 'debug';
const dlog = debug('readSourceFile');


const inputSchema = baseInputSchema.extend({
    filePath: z.string().describe('The path to the source file to read.'),
}).describe('The file path options');
export type ReadSourceFileInput = z.infer<typeof inputSchema>;

const outputSchema = z.promise(z.string()).describe('The content of the source file as a single string.');
const fnSchema = z.function().args(inputSchema).returns(outputSchema)
    .describe('Read the content of a source file and return it as a single string.');

async function readSourceFile(input: ReadSourceFileInput): Promise<string> {
    const { filePath } = input;
    dlog(`Reading source file: ${filePath}`);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        dlog(`File content length: ${content.length}`);
        return content;
    } catch (error) {
        return `Error reading source file: ${(error as Error).message}`;
    }
}

export const ReadSourceFile = z.object({
    name: z.literal('readSourceFile'),
    inputSchema,
    outputSchema,
    fnSchema
});

export const config: FunctionConfig<ReadSourceFileInput, string> = {
    name: 'readSourceFile',
    inputSchema,
    outputSchema,
    fnSchema,
    fn: readSourceFile,
};

export default config;
