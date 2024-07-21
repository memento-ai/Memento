// Path: packages/memento-db/src/getMementoById.ts

import {
    ConvExchangeMemento,
    ConversationMemento,
    DocSummaryMemento,
    DocumentMemento,
    FunctionCallMemento,
    Memento,
    MetaId,
    ResolutionMemento,
    SynopsisMemento,
} from 'packages/types'

import { sql, type DatabasePool } from 'slonik'

export async function getMementoById(pool: DatabasePool, id: MetaId): Promise<Memento> {
    const query = sql.type(Memento)`
            SELECT
                content,
                created_at,
                docid,
                id,
                kind,
                memid,
                role,
                source,
                summaryid
                tokens
            FROM
                memento
            WHERE
                id = ${id}
        `
    const m: Memento = await pool.one(query)
    switch (m.kind) {
        case 'conv': {
            const { content, id, role, docid, kind, tokens, created_at } = m
            return { content, id, role, docid, kind, tokens, created_at } as ConversationMemento
        }
        case 'doc': {
            const { content, id, kind, tokens, created_at, summaryid } = m
            return { content, id, kind, tokens, created_at, summaryid } as DocumentMemento
        }
        case 'frag': {
            throw new Error('`frag` kind not yet implemented')
        }
        case 'dsum': {
            const { content, id, docid, kind, tokens, created_at } = m
            return { content, id, docid, kind, tokens, created_at } as DocSummaryMemento
        }
        case 'res': {
            const { content, id, kind, tokens, created_at } = m
            return { content, id, kind, tokens, created_at } as ResolutionMemento
        }
        case 'syn': {
            const { content, id, docid, kind, tokens, created_at } = m
            return { content, id, docid, kind, tokens, created_at } as SynopsisMemento
        }
        case 'xchg': {
            const { content, id, kind, tokens, created_at } = m
            return { content, id, kind, tokens, created_at } as ConvExchangeMemento
        }
        case 'func': {
            const { content, id, docid, kind, tokens, created_at, source } = m
            return { content, id, docid, kind, tokens, created_at, source } as FunctionCallMemento
        }
    }
}
