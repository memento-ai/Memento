import { z, ZodObject } from 'zod';
import { registry } from './functions/index';
import debug from 'debug';

const dlog = debug('functionRegistry');

export const baseInputSchema = z.object({
    context: z.optional(z.object({
        readonlyPool: z.any()
    })).describe('An optional context object. Leave unspecified -- Memento will provide.'),
});
export type BaseInput = z.infer<typeof baseInputSchema>;

export const ErrorMessage = z.object({ error: z.string() });
export type ErrorMessage = z.infer<typeof ErrorMessage>;

export interface Function<Input, Output> {
    (input: Input): Promise<Output>;
}

export interface FunctionConfig<Input, Output> {
    name: string;
    inputSchema: z.ZodType<Input>;
    outputSchema: z.ZodType<Promise<Output>>;
    fnSchema: z.ZodType<Function<Input, Output>>;
    fn: Function<Input, Output>;
}

function generateDescription(schema: z.ZodTypeAny, key: string, indent: number): string[] {
    dlog('Generating description for:', key);
    let lines : string[] = [];
    const prefix = '    '.repeat(indent);
    lines.push(`${prefix}${key}: ${schema.description || "<no description>"}`);
    if (schema instanceof ZodObject) {
        dlog('Generating description for keys:', Object.keys(schema.shape));
        const entries = Object.entries(schema.shape);
        const accum: string[] = [];
        const body: string[] = entries.reduce((acc, [key_, schema_]) : string[] => {
            acc.push(...generateDescription(schema_ as z.ZodTypeAny, key_, indent+1));
            return acc;
        }, accum);
        lines.push(...body);
    }
    return lines;
}

export function generateFunctionDescription(
    config: FunctionConfig<any, any>
): string {
    const { name, inputSchema, outputSchema, fnSchema } = config;

    const functionDescription = generateDescription(fnSchema, 'Purpose', 1).join('\n');
    const inputDescription = generateDescription(inputSchema, 'Input', 1).join('\n');
    const outputDescription = generateDescription(outputSchema, 'Output', 1).join('\n');

    return `
Function: ${name}
${functionDescription}
${inputDescription}
${outputDescription}
`.trim();
}

export function getRegistryDescription(): string {
    const functionConfigs = Object.values(registry);
    const descriptions = functionConfigs.map(generateFunctionDescription);
    return `
Available functions:

${descriptions.join('\n\n')}
`.trim();
}
