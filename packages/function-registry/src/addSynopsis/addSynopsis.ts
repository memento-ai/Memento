// Path: packages/function-registry/src/addSynopsis/addSynopsis.ts

import { addMemento } from '@memento-ai/postgres-db'
import { SYN, SynopsisMetaArgs } from '@memento-ai/types'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { ID, baseInputSchema, type FunctionConfig } from '../functionRegistry'

const inputSchema = baseInputSchema
    .extend({
        content: z
            .string()
            .describe('A brief synopsis of one conversational exchange -- the assistants inner thoughts.'),
    })
    .describe('The input for synopsis')
export type SynopsisInput = z.input<typeof inputSchema>

const outputSchema = z.promise(ID).describe('The id of the created synopsis meta.')

const fnSchema = z
    .function()
    .args(inputSchema)
    .returns(outputSchema)
    .describe('Creates one synopsis memento from the input.')

export async function addSynopsis(input: SynopsisInput): Promise<ID> {
    const { content, context } = input
    if (!context) {
        throw new Error('Context is required')
    }
    const pool = context.pool
    if (!pool) {
        throw new Error('Pool is required')
    }

    const metaArgs: SynopsisMetaArgs = { kind: SYN }
    const metaId = nanoid()
    return await addMemento({ pool, metaId, content, metaArgs })
}

export const AddSynopsis = z.object({
    name: z.literal('addSynopsis'),
    inputSchema,
    outputSchema,
    fnSchema,
})

const config: FunctionConfig<SynopsisInput, ID> = {
    name: 'addSynopsis',
    async: z.boolean().describe('Whether the function should be executed asynchronously'),
    inputSchema,
    outputSchema,
    fnSchema,
    fn: addSynopsis,
}

export default config
