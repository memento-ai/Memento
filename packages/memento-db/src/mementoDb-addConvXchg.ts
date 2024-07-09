// Path: packages/memento-db/src/mementoDb-addConvXchg.ts

import type { ID } from '@memento-ai/postgres-db'
import { addMementoWithConn } from '@memento-ai/postgres-db'
import {
    ASSISTANT,
    CONV,
    ConvExchangeMetaArgs,
    ConversationMetaArgs,
    Mem,
    USER,
    XCHG,
    createMem,
} from '@memento-ai/types'
import { zodParse } from '@memento-ai/utils'
import debug from 'debug'
import { nanoid } from 'nanoid'
import { sql, type DatabasePool } from 'slonik'
import type { AddConvExchangeFuncArgs } from './mementoDb-types'

const dlog = debug('mementoDb:mems')

export async function addConvExchangeFuncMementos(pool: DatabasePool, args_: AddConvExchangeFuncArgs): Promise<ID> {
    const { userContent, asstContent, funcMementoIds } = args_

    const result = await pool.connect(async (conn) => {
        const userMem: Mem = await createMem(userContent)
        const asstMem: Mem = await createMem(asstContent)
        const xchgMem: Mem = await createMem(
            `# User:\n${userContent.trim()}\n\n---\n\n# Assistant:\n${asstContent.trim()}\n`
        )

        const userMetaId = nanoid()
        const asstMetaId = nanoid()
        const xchgMetaId = nanoid()

        const userMetaArgs = zodParse(ConversationMetaArgs, {
            kind: CONV,
            role: USER,
            source: 'conversation',
            docid: xchgMetaId,
        })

        const asstMetaArgs = zodParse(ConversationMetaArgs, {
            kind: CONV,
            role: ASSISTANT,
            source: 'conversation',
            docid: xchgMetaId,
        })

        const xchgMetaArgs = zodParse(ConvExchangeMetaArgs, {
            kind: XCHG,
        })

        const userID = await addMementoWithConn({ conn, mem: userMem, metaId: userMetaId, metaArgs: userMetaArgs })
        const asstID = await addMementoWithConn({ conn, mem: asstMem, metaId: asstMetaId, metaArgs: asstMetaArgs })
        const xchgID = await addMementoWithConn({ conn, mem: xchgMem, metaId: xchgMetaId, metaArgs: xchgMetaArgs })

        dlog('Added conversation exchange mementos:', { userID, asstID, xchgID })
        dlog('Updating func mementos to point to xchg memento:', funcMementoIds)

        // Update the func mementos to point to the xchg memento
        if (funcMementoIds.length > 0) {
            const updateQuery = sql.unsafe`
                UPDATE meta
                SET docid = ${xchgMetaId}
                WHERE id in (${sql.join(funcMementoIds, sql.fragment`, `)})
            `
            await conn.query(updateQuery).catch((err) => {
                Error.captureStackTrace(err)
                console.error(err.stack)
                throw err
            })
        }

        return xchgID
    })

    return result
}
