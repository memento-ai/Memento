// Path: packages/types/src/role.ts

import { z } from 'zod';

// We restrict Role to just 'user' and 'assistant' here even though the third role 'system'
// is necessary for some providers. Unfortunately Anthropic does not support the 'system'
// role, and it is cleanest for us to limit to the least common denominator.

export const Role = z.enum(['user', 'assistant']);
export type Role = z.TypeOf<typeof Role>;

export const { user: USER, assistant: ASSISTANT } = Role.enum;
