// Path: packages/search/src/mementoSearchResult.ts

import { RequiredMetaBase } from '@memento-ai/types';
import { z } from 'zod';

export const MementoSearchResult = RequiredMetaBase.pick({
    content: true,
    id: true,
    kind: true,
    source: true,
})
.extend({
    content: z.string(),
    tokens: z.number(),
    rank: z.number(),
});
export type MementoSearchResult = z.infer<typeof MementoSearchResult>;
