// Path: packages/utils/src/zodParse.ts

import TraceError from 'trace-error'
import { z } from 'zod'

export function zodParse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
    try {
        return schema.parse(input)
    } catch (error) {
        if (error instanceof z.ZodError) {
            const err = new Error(error.message)
            Error.captureStackTrace(err)
            console.error(err.stack)
            const traced = new TraceError(error.message, err)
            console.error(traced.stack)
            throw traced
        }
        throw error
    }
}
