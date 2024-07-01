// Path: packages/memento-agent/src/dynamicContent.ts

import type { Config } from '@memento-ai/config'
import type { MementoDb } from '@memento-ai/memento-db'
import type { MementoSearchResult, MementoSimilarityMap } from '@memento-ai/search'
import { asSimilarityMap } from '@memento-ai/search'
import type { MemKind, Message } from '@memento-ai/types'
import { CONV, MemKindValues, Role, XCHG } from '@memento-ai/types'
import { sql } from 'slonik'
import { z } from 'zod'

export type MementoSearchResultMap = Record<string, MementoSearchResult>
export type AdditionalContextIndex = Record<MemKind, MementoSearchResultMap>

export type DynamicContent = {
    additionalContext: AdditionalContextIndex
    messages: Message[]
}

function makeAdditionalContextIndex(): AdditionalContextIndex {
    const mementosByKind: Partial<AdditionalContextIndex> = {}
    MemKindValues.forEach((kind: MemKind) => {
        mementosByKind[kind] = {}
    })
    return mementosByKind as AdditionalContextIndex
}

function indexMementosByKind(mementos: MementoSimilarityMap): AdditionalContextIndex {
    const mementosByKind: AdditionalContextIndex = makeAdditionalContextIndex()

    for (const [id, memento] of Object.entries(mementos)) {
        if ((memento.kind as string) !== 'csum') mementosByKind[memento.kind][id] = memento
    }

    return mementosByKind
}

function removeConv(id: string, index: AdditionalContextIndex): void {
    delete index[CONV][id]
}

function removeXchg(id: string, index: AdditionalContextIndex): void {
    delete index[XCHG][id]
}

const MessageIdPair = z.object({
    id: z.string(),
    docid: z.string(),
    role: Role,
    content: z.string(),
})
type MessageIdPair = z.infer<typeof MessageIdPair>

export async function getRecentConversation(db: MementoDb, max_exchanges: number): Promise<MessageIdPair[]> {
    const query = sql.type(MessageIdPair)`
        WITH recent_messages AS (
            SELECT
                id, docid, role, content, created_at
            FROM memento
            WHERE
                kind = 'conv'
            ORDER BY
                created_at DESC
            LIMIT ${max_exchanges} * 2
        )
        SELECT
            id, docid, role, content
        FROM
            recent_messages
        ORDER BY
            created_at ASC;
    `

    const result = await db.pool.query(query)
    return result.rows.map((row) => MessageIdPair.parse(row))
}

export async function gatherContent(
    db: MementoDb,
    results: MementoSearchResult[],
    config: Config
): Promise<DynamicContent> {
    const similarMementos: MementoSimilarityMap = await asSimilarityMap(results)
    const mementosByKind = indexMementosByKind(similarMementos)

    const max_exchanges = config.conversation.max_exchanges
    const messages: MessageIdPair[] = await getRecentConversation(db, max_exchanges)

    // If the recent conversation message are contained in the additional context, remove them.
    for (const message of messages) {
        removeConv(message.id, mementosByKind)
        removeXchg(message.docid, mementosByKind)
    }

    return {
        additionalContext: mementosByKind,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }
}

export function kindContent(kind: MemKind, content: AdditionalContextIndex): MementoSearchResult[] {
    const kindValues = Object.values(content[kind])
    if (!kindValues.length) return []
    if (kindValues[0].created_at instanceof Date)
        return kindValues.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    return kindValues.sort((a, b) => (b.created_at as unknown as number) - (a.created_at as unknown as number))
}
