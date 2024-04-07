// File: packages/function-calling/src/functions/getCurrentTime.ts

import { z } from 'zod';
import { baseInputSchema } from '../functionRegistry';
import type { BaseInput, FunctionConfig } from '../functionRegistry';

const inputSchema = baseInputSchema.describe('No input required');
const outputSchema = z.promise(z.string()).describe('ISO string');
const fnSchema = z.function().args(inputSchema).returns(outputSchema).describe('Returns the current UTC time');

function getCurrentTime() : Promise<string> {
    return Promise.resolve(new Date().toISOString());
}

export const discriminatedUnion = z.discriminatedUnion('name', [
    z.object({
      name: z.literal('getCurrentTime'),
      inputSchema,
      outputSchema,
      fnSchema
    }),
  ]);

export const config: FunctionConfig<BaseInput, string> = {
  name: 'getCurrentTime',
  inputSchema,
  outputSchema,
  fnSchema,
  fn: getCurrentTime,
};

export default config;