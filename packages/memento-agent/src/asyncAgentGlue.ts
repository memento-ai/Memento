// Path: packages/memento-agent/src/asyncAgentGlue.ts

import type { MementoDb } from '@memento-ai/memento-db'
import type { ID } from '@memento-ai/postgres-db'
import type { ResolutionAgent } from '@memento-ai/resolution-agent'
import type { SynopsisAgent } from '@memento-ai/synopsis-agent'
import type { Message } from '@memento-ai/types'
import { ASSISTANT } from '@memento-ai/types'

export type AwaitAsyncResponseArgs = {
    asyncActionsPromise: Promise<string>
} // Placeholder for async actions

export async function awaitAsyncAgentActions({ asyncActionsPromise }: AwaitAsyncResponseArgs): Promise<string> {
    return await asyncActionsPromise
}
export type StartAsyncAgentsArgs = {
    resolutionAgent?: ResolutionAgent
    synopsisAgent?: SynopsisAgent
    xchgId?: ID
    db: MementoDb
}

export type StartAsyncAgentsResults = Promise<string>

export function startAsyncAgentActions({
    synopsisAgent,
    resolutionAgent,
    xchgId,
    db,
}: StartAsyncAgentsArgs): StartAsyncAgentsResults {
    let promise: Promise<string> = Promise.resolve('')

    if (synopsisAgent) {
        promise = synopsisAgent.run().then(async (response: string) => {
            const message: Message = { content: response, role: ASSISTANT }
            const id = await db.addSynopsisMem({ content: message.content })
            if (xchgId) {
                await db.linkExchangeSynopsis({ xchg_id: xchgId.id, synopsis_id: id.id })
            }
            console.info('New synopsis:', message.content)
            return message.content
        })
    }

    if (resolutionAgent) {
        promise = resolutionAgent.run().then(async (response: string) => {
            const message: Message = { content: response, role: ASSISTANT }
            const { content } = message
            const regex = /<resolution>(.*?)<\/resolution>/gm
            const matches = content.matchAll(regex)
            for await (const match of matches) {
                const resolution = match[1]
                if (!resolution || resolution.length === 0) {
                    console.info('Empty resolution')
                    continue
                } else {
                    console.info('New resolution:', resolution)
                    await db.addResolutionMem({ content: resolution })
                }
            }
            return message.content
        })
    }

    return promise
}
