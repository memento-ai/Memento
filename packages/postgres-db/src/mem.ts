// Path: packages/postgres-db/src/mem.ts

import { Mem } from '@memento-ai/types'
import type { CommonQueryMethods } from 'slonik'
import { sql } from 'slonik'

export async function insertMem(pool: CommonQueryMethods, mem: Mem): Promise<void> {
    const embed_vector = JSON.stringify(mem.embed_vector)
    await pool.query(sql.unsafe`
        INSERT INTO mem (id, content, embed_vector, tokens)
        VALUES (${mem.id}, ${mem.content}, ${embed_vector}, ${mem.tokens})
        ON CONFLICT (id) DO NOTHING;`)
}
