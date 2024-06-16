// Path: packages/function-calling/src/functionRegistry.ts

import { z, ZodObject } from 'zod';
import debug from 'debug';

const dlog = debug('functionRegistry');

export const ID = z.object({ id: z.string() }).describe('The id of the created meta record.');
export type ID = z.infer<typeof ID>;

export const baseInputSchema = z.object({
    context: z.optional(z.object({
        readonlyPool: z.any().optional(),
        pool: z.any().optional(),
    })).describe('An optional context object. Leave unspecified -- Memento will provide.'),
});
export type BaseInput = z.infer<typeof baseInputSchema>;

export const ErrorMessage = z.object({ error: z.string() });
export type ErrorMessage = z.infer<typeof ErrorMessage>;

export interface IFunction<Input, Output> {
    (input: Input): Promise<Output>;
}

export interface FunctionConfig<Input, Output> {
    name: string;
    async?: z.ZodSchema<boolean>;
    inputSchema: z.ZodSchema<Input>;
    outputSchema: z.ZodSchema<Promise<Output>>;
    fnSchema: z.ZodSchema<IFunction<Input, Output>>;
    fn: IFunction<Input, Output>;
    extraTypes?: Record<string, z.ZodTypeAny>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FunctionRegistry = Record<string, FunctionConfig<any, any>>;

export function registerFunction<Input, Output>(registry: FunctionRegistry, config: FunctionConfig<Input, Output>) {
    registry[config.name] = config;
}

function generateDescription(schema: z.ZodTypeAny, key: string, indent: number): string[] {
    dlog('Generating description for:', key);
    const lines : string[] = [];
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

function generateExtraTypesDescription(indent: number, extraTypes?: Record<string, z.ZodTypeAny>): string[] {
    if (!extraTypes) {
        return [];
    }
    const prefix = ['    '.repeat(indent) + 'Nested Types:']
    return prefix.concat(Object.entries(extraTypes).map(([key, schema]) => generateDescription(schema, key, indent+1).join('\n')));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateFunctionDescription(config: FunctionConfig<any, any>): string {
    const { name, async, inputSchema, outputSchema, fnSchema, extraTypes } = config;

    const functionDescription = generateDescription(fnSchema, 'Purpose', 1).join('\n');
    const inputDescription = generateDescription(inputSchema, 'Input', 1).join('\n');
    const outputDescription = generateDescription(outputSchema, 'Output', 1).join('\n');
    const extraTypesDescription = generateExtraTypesDescription(1, extraTypes).join('\n');

    return `
Function: ${name}
${functionDescription}${async ? '\n' + generateDescription(async, 'Async', 1) : ''}
${inputDescription}
${outputDescription}
${extraTypesDescription}
`.trim();
}

export function getRegistryDescription(registry: FunctionRegistry): string {
    const functionConfigs = Object.values(registry);
    const descriptions = functionConfigs.map(generateFunctionDescription);
    return `
Available functions:

${descriptions.join('\n\n')}
`.trim();
}
