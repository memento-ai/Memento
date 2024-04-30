// Path: packages/utils/src/zodParse.ts

import { z } from 'zod';
import TraceError from "trace-error";

export function zodParse<T>(schema: z.ZodSchema<T>, input: any): T {
    const result = schema.safeParse(input);
    if (result.success) {
        return result.data;
    } else {
        const err = new Error(result.error.message);
        Error.captureStackTrace(err);
        console.error(err.stack);
        const traced = new TraceError(result.error.message, err);
        console.error(traced.stack);
        throw traced;
    }
}
