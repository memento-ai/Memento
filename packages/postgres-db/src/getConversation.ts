// Path: packages/postgres-db/src/getConversation.ts

import type { Message } from "@memento-ai/types";
import { type DatabasePool, sql } from "slonik";

export async function getConversation(pool: DatabasePool, maxMessagePairs: number = 10): Promise<Message[]> {
    let result: Message[] = [];
    await pool.connect(async conn => {
        const conversation = await conn.query(sql.unsafe`
            WITH recent_messages AS (
                SELECT
                m.content,
                mt.role,
                mt.created_at
                FROM
                meta mt
                JOIN
                mem m ON m.id = mt.memid
                WHERE
                mt.kind = 'conv'
                ORDER BY
                mt.created_at DESC
                LIMIT ${maxMessagePairs} * 2
            )
            SELECT
                content,
                role
            FROM
                recent_messages
            ORDER BY
                created_at ASC;
            `);
        result = conversation.rows.map(({role, content}) => ({ role, content }));
    });
    return result;
}
