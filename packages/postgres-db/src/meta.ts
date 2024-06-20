// Path: packages/postgres-db/src/meta.ts

import {
    CONV,
    ConvExchangeMetaArgs,
    ConversationMetaArgs,
    DOC,
    DSUM,
    DocSummaryMetaArgs,
    DocumentMetaArgs,
    FRAG,
    FragmentMetaArgs,
    MetaArgs,
    MetaId,
    RES,
    ResolutionMetaArgs,
    SYN,
    SynopsisMetaArgs,
    XCHG,
} from '@memento-ai/types'
import { zodParse } from '@memento-ai/utils'
import debug from 'debug'
import type { CommonQueryMethods, QueryResult } from 'slonik'
import { sql } from 'slonik'

const dlog = debug('postgres-db:meta')

export type ID = { id: MetaId }

export async function insertMeta(
    conn: CommonQueryMethods,
    memId: string,
    metaId: string,
    metaArgs: MetaArgs
): Promise<ID[]> {
    const { kind } = metaArgs
    let results: QueryResult<ID>
    switch (kind) {
        case CONV: {
            const { role, source, priority, docid } = zodParse(ConversationMetaArgs, metaArgs)
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind, role, source, priority, docid)
                VALUES (${metaId}, ${memId}, ${metaArgs.kind}, ${role}, ${source}, ${priority ?? null}, ${
                docid ?? null
            })
                RETURNING id`)
            break
        }
        case FRAG: {
            const { docid } = zodParse(FragmentMetaArgs, metaArgs)
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind, docid)
                VALUES (${metaId}, ${memId}, ${metaArgs.kind}, ${docid})
                RETURNING id`)
            break
        }
        case DOC: {
            const { summaryid, source } = zodParse(DocumentMetaArgs, metaArgs)
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind, source, summaryid)
                VALUES (${metaId}, ${memId}, ${metaArgs.kind}, ${source}, ${summaryid})
                RETURNING id`)
            break
        }
        case DSUM: {
            const { docid, source } = zodParse(DocSummaryMetaArgs, metaArgs)
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind, docid, source)
                VALUES (${metaId}, ${memId}, ${metaArgs.kind}, ${docid}, ${source})
                RETURNING id`)
            break
        }
        case RES: {
            const { kind } = zodParse(ResolutionMetaArgs, metaArgs)
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind)
                VALUES (${metaId}, ${memId}, ${kind})
                RETURNING id`)
            break
        }
        case SYN: {
            const { kind } = zodParse(SynopsisMetaArgs, metaArgs)
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind)
                VALUES (${metaId}, ${memId}, ${kind})
                RETURNING id`)
            break
        }
        case XCHG: {
            const { kind } = zodParse(ConvExchangeMetaArgs, metaArgs)
            results = await conn.query(sql.unsafe`
                INSERT INTO meta (id, memid, kind)
                VALUES (${metaId}, ${memId}, ${kind})
                RETURNING id`)
            break
        }

        default:
            throw new Error(`Unsupported MemMetaData kind: ${kind}`)
    }
    const result = results.rows.map((row) => ({ id: row.id }))
    dlog(result)
    return result
}
