// Path: packages/function-registry/src/writeSourceFile/writeSourceFile.ts

import { Context } from '@memento-ai/memento-db'
import { getMementoProjectRoot } from '@memento-ai/utils'
import debug from 'debug'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { baseInputSchema, type FunctionConfig } from '../functionRegistry'

const dlog = debug('writeSourceFile')

export const StringifyableContent = z
    .union([z.string(), z.object({})])
    .describe('The content to write to the file. Can be a string or an object that will be stringified.')
export type StringifyableContent = z.input<typeof StringifyableContent>

const inputSchema = baseInputSchema
    .extend({
        filePath: z.string().describe('The path to the source file to write.'),
        content: StringifyableContent,
    })
    .describe('The file path and content to write')
export type WriteSourceFileInput = z.input<typeof inputSchema>

const outputSchema = z.promise(z.string()).describe('A message indicating success or failure of the write operation.')
const fnSchema = z
    .function()
    .args(inputSchema, Context)
    .returns(outputSchema)
    .describe('Write content to a source file and return a status message.')

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function writeSourceFile(input: WriteSourceFileInput, _context: Context): Promise<string> {
    const { filePath } = input
    let { content } = input
    dlog(`Writing to source file: ${filePath}`)

    if (typeof content === 'object') {
        content = JSON.stringify(content)
    }

    try {
        const projectRoot = getMementoProjectRoot()
        const fullPath = path.join(projectRoot, filePath)

        // Basic security check
        if (!fullPath.startsWith(projectRoot) || fullPath.includes('.git')) {
            throw new Error('Invalid file path. Must be within project directory and not in .git folder.')
        }

        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, content as string, 'utf-8')
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
