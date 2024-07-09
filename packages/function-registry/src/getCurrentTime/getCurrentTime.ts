// Path: packages/function-registry/src/getCurrentTime/getCurrentTime.ts

import { Context } from '@memento-ai/memento-db'
import { z } from 'zod'
import type { BaseInput, FunctionConfig } from '../functionRegistry'
import { baseInputSchema } from '../functionRegistry'

const inputSchema = baseInputSchema.describe('No input parameters are necessary, so provide an empty object.')
const outputSchema = z.promise(z.string()).describe('ISO string')

const fnSchema = z.function().args(inputSchema, Context).returns(outputSchema).describe('Returns the current UTC time')

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getCurrentTime(_input: BaseInput, _context: Context): Promise<string> {
    return Promise.resolve(new Date().toISOString())
}

export const GetCurrentTime = z.object({
    name: z.literal('getCurrentTime'),
    inputSchema,
    outputSchema,
    fnSchema,
})

export const config: FunctionConfig<BaseInput, string> = {
    name: 'getCurrentTime',
    inputSchema,
    outputSchema,
    fnSchema,
    fn: getCurrentTime,
}

export default config
