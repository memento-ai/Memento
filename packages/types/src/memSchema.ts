// Path: packages/types/src/memSchema.ts

import { z } from 'zod';

import { embedding } from '@memento-ai/embedding';
import { count_tokens } from '@memento-ai/encoding';
import { zodParse } from '@memento-ai/utils';

// A Mem is one record of the `mem` table.
// A Mem is entirely determined by its `content` string.
// A Mem must be referenced by a Meta in order to be usable content.
// Occasionally via conversation some new content might be identical to existing
// content. When this the existing mem will be reused.
// It is also possible for that a mem will be left a dangling reference if the meta
// referencing it is deleted. Such mems can be easily garbage-collected using
// the delete_unreferenced_mems() function but the Memento cli application does not
// do so automatically. The ingest application always deletes unreferenced mems just
// before it exits.

export const MemId = z.string().max(24);
export type MemId = z.infer<typeof MemId>;

export const Mem = z.object({
    id: MemId,
    content: z.string(),
    embed_vector: z.array(z.number()),
    tokens: z.number(),
});
export type Mem = z.output<typeof Mem>;

// All columns of the mem table are determined by the `content` column.
// We can create a Mem in memory using this function:
export async function createMem(content: string) : Promise<Mem> {
    const hasher = new Bun.CryptoHasher("md4");
    hasher.update(content);
    const id: MemId = hasher.digest('base64');
    const mem: Mem = zodParse(Mem, {
        id,
        content: content,
        embed_vector: await embedding.generateOne(content),
        tokens: count_tokens(content)
    })
    return mem;
}
