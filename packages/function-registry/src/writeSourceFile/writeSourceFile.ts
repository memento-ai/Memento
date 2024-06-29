// Path: packages/function-registry/src/writeSourceFile/writeSourceFile.ts

import { getMementoProjectRoot } from '@memento-ai/utils'
import debug from 'debug'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { baseInputSchema, type FunctionConfig } from '../functionRegistry'

const dlog = debug('writeSourceFile')

const inputSchema = baseInputSchema
    .extend({
        filePath: z.string().describe('The path to the source file to write.'),
        content: z.string().describe('The content to write to the file.'),
    })
    .describe('The file path and content to write')
export type WriteSourceFileInput = z.infer<typeof inputSchema>

const outputSchema = z.promise(z.string()).describe('A message indicating success or failure of the write operation.')
const fnSchema = z
    .function()
    .args(inputSchema)
    .returns(outputSchema)
    .describe('Write content to a source file and return a status message.')

export async function writeSourceFile(input: WriteSourceFileInput): Promise<string> {
    const { filePath, content } = input
    dlog(`Writing to source file: ${filePath}`)

    try {
        const projectRoot = getMementoProjectRoot()
        const fullPath = path.join(projectRoot, filePath)

        // Basic security check
        if (!fullPath.startsWith(projectRoot) || fullPath.includes('.git')) {
            throw new Error('Invalid file path. Must be within project directory and not in .git folder.')
        }

        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, content, 'utf-8')
        dlog(`File written successfully: ${fullPath}`)
        return `File successfully written to ${filePath}`
    } catch (error) {
        const errorMessage = `Error writing to source file: ${(error as Error).message}`
        dlog(errorMessage)
        return errorMessage
    }
}

export const WriteSourceFile = z.object({
    name: z.literal('writeSourceFile'),
    inputSchema,
    outputSchema,
    fnSchema,
})

export const config: FunctionConfig<WriteSourceFileInput, string> = {
    name: 'writeSourceFile',
    inputSchema,
    outputSchema,
    fnSchema,
    fn: writeSourceFile,
}

export default config
