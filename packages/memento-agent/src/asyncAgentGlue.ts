// Path: packages/memento-agent/src/asyncAgentGlue.ts

import debug from "debug";
import { ASSISTANT, type Message } from "@memento-ai/types";
import type { MementoDb } from "@memento-ai/memento-db";
import type { SynopsisAgent } from "@memento-ai/synopsis-agent";
import type { ID } from "@memento-ai/postgres-db";

export type AwaitAsyncResponseArgs = {
    asyncActionsPromise: Promise<string>;
}    // Placeholder for async actions

export async function awaitAsyncAgentActions({ asyncActionsPromise }: AwaitAsyncResponseArgs): Promise<string> {
    return await asyncActionsPromise;
}
export type StartAsyncAgentsArgs = {
    synopsisAgent?: SynopsisAgent;
    xchgId?: ID;
    db: MementoDb;
};

export type StartAsyncAgentsResults = Promise<string>;

export function startAsyncAgentActions(
    { synopsisAgent, xchgId, db }: StartAsyncAgentsArgs)
    : StartAsyncAgentsResults {

    let promise: Promise<string> = Promise.resolve("");

    if (!!synopsisAgent) {
        promise = synopsisAgent.run()
        .then(async (response: string) => {
            const message: Message = { content: response, role: ASSISTANT };
            const id = await db.addSynopsisMem({content: message.content});
            if (!!xchgId) {
                await db.linkExchangeSynopsis({xchg_id: xchgId.id, synopsis_id: id.id});
            }
            return message.content;
        });
    }

    return promise;
}
