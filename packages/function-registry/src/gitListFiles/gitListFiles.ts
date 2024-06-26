// Path: packages/function-registry/src/gitListFiles/gitListFiles.ts

import { gitListRepositoryFiles as listFiles } from '@memento-ai/utils'
import { z } from 'zod'
import type { FunctionConfig } from '../functionRegistry'
import { baseInputSchema } from '../functionRegistry'

const inputSchema = baseInputSchema
    .extend({})
    .describe('No input parameters are necessary, so provide an empty object.')
export type GitListFilesInput = z.infer<typeof inputSchema>

const outputSchema = z.promise(z.array(z.string())).describe('Array of file paths')
export type GitListFilesOutput = z.infer<typeof outputSchema>

const fnSchema = z
    .function()
    .args(inputSchema)
    .returns(outputSchema)
    .describe('Returns list of file paths tracked by git for the current repository.')

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function gitListFiles(_: GitListFilesInput): Promise<string[]> {
    try {
        return listFiles()
    } catch (error) {
        return [`Error listing file paths: ${(error as Error).message}`]
    }
}

export const GitListFiles = z.object({
    name: z.literal('gitListFiles'),
    inputSchema,
    outputSchema,
    fnSchema,
})

export const config: FunctionConfig<GitListFilesInput, string[]> = {
    name: 'gitListFiles',
    inputSchema,
    outputSchema,
    fnSchema,
    fn: gitListFiles,
}

export default config
