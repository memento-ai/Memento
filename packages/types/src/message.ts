// Path: packages/types/src/message.ts
import { z } from 'zod';

import { Role } from './role';

export const Message = z.object({
    content: z.string(),
    role: Role
});
export type Message = z.TypeOf<typeof Message>;
