// Path: packages/postgres-db/src/getConversation.ts

import type { Config } from '@memento-ai/config'
import { Message } from '@memento-ai/types'
import debug from 'debug'
import type { DatabasePool } from 'slonik'
import { sql } from 'slonik'
import { z } from 'zod'

const dlog = debug('postgres-db:getConversation')

const ConvResult = Message.extend({
    tokens: z.number(),
})
type ConvResult = z.infer<typeof ConvResult>

export async function getConversation(pool: DatabasePool, config: Config): Promise<Message[]> {
    const { conversation } = config
    const { max_exchanges, max_tokens } = conversation
    const result: Message[] = await pool.connect(async (conn) => {
        const conversation = await conn.query(sql.type(ConvResult)`
            WITH recent_messages AS (
                SELECT
                    m.content,
                    mt.role,
                    m.tokens,
                    mt.created_at
                FROM
                    meta mt
                JOIN
                    mem m ON m.id = mt.memid
                WHERE
                    mt.kind = 'conv'
                ORDER BY
                    mt.created_at DESC
                LIMIT ${max_exchanges} * 2
            )
            SELECT
                content,
                tokens,
                role
            FROM
                recent_messages
            ORDER BY
                created_at ASC;
            `)
        const rows = conversation.rows.map(({ role, content, tokens }) => ({ role, content, tokens }))
        let total_tokens = rows.reduce((acc, { tokens }) => acc + tokens, 0)
        dlog('total_tokens', total_tokens, 'messages', rows.length)
        // Remove messages from the front (oldest) until we have an even number of messages and we have fewer than max_tokens
        while (total_tokens > max_tokens || rows.length % 2 !== 0) {
            const { tokens } = rows.shift() as ConvResult
            total_tokens -= tokens
            dlog('total_tokens', total_tokens, 'messages', rows.length)
        }

        return rows.map(({ role, content }) => ({ role, content }))
    })
    return result
}
