// Path: packages/utils/src/copy-ingested-mementos.ts

import type { DatabasePool } from 'slonik';
import { sql } from 'slonik';

export async function copyIngestedMementos(fromPool: DatabasePool, toPool: DatabasePool) {
    const memids = await fromPool.query(sql.unsafe`
        SELECT memid
        FROM memento
        WHERE kind IN ('doc', 'dsum')
        `);

    for (const row of memids.rows) {
        const memid = row.memid;
        const mem = await fromPool.query(sql.unsafe`
            SELECT * FROM mem WHERE id = ${memid}
            `);
        const meta = await fromPool.query(sql.unsafe`
            SELECT * FROM meta WHERE memid = ${memid}
            `);
        const memv = mem.rows[0];
        await toPool.query(sql.unsafe`
            INSERT INTO mem (id, content, embed_vector, tokens) VALUES (${memv.id}, ${memv.content}, ${memv.embed_vector}, ${memv.tokens})
            ON CONFLICT (id) DO NOTHING`);
        const metav = meta.rows[0];
        await toPool.query(sql.unsafe`
            INSERT INTO meta (id, memid, kind, source, docid, summaryid) VALUES (${metav.id}, ${metav.memid}, ${metav.kind}, ${metav.source}, ${metav.docid}, ${metav.summaryid})
            ON CONFLICT (id) DO UPDATE SET memid = EXCLUDED.memid, kind = EXCLUDED.kind, source = EXCLUDED.source, docid = EXCLUDED.docid, summaryid = EXCLUDED.summaryid`);
    }
}
