// Path: packages/utils/src/zodParse.ts

import { z } from 'zod'

export function zodParse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
    const parsed = schema.safeParse(input)
    if (parsed.success) {
        return parsed.data
    } else {
        Error.captureStackTrace(parsed.error)
        console.error(parsed.error.stack)
        throw parsed.error
    }
}
