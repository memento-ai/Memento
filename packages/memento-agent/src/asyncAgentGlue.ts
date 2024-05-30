// Path: packages/memento-agent/src/asyncAgentGlue.ts

import debug from "debug";
import c from 'ansi-colors';
import { ASSISTANT, type Message } from "@memento-ai/types";
import type { MementoDb } from "@memento-ai/memento-db";
import type { SynopsisAgent } from "@memento-ai/synopsis-agent";
import type { ContinuityAgent } from "../../continuity-agent";
import type { ID } from "@memento-ai/postgres-db";

const clog = debug("mementoAgent:continuity");

export type AwaitContinuityResponseArgs = {
    continuityResponsePromise: Promise<string>;
}

export async function awaitAsyncAgentActions({ continuityResponsePromise }: AwaitContinuityResponseArgs): Promise<string | null>{
    let continuityResponseContent: string | null = null;

    try {
        const result = await continuityResponsePromise;
        continuityResponseContent = result;
        clog(c.yellow(`Continuity Agent Response: ${continuityResponseContent}`));
    } catch (e) {
        clog(c.red(`Continuity Agent Response Error: ${(e as Error).message}`));
    }

    return continuityResponseContent;
}

export type StartAsyncAgentsArgs = {
    synopsisAgent?: SynopsisAgent;
    xchgId?: ID;
    continuityAgent?: ContinuityAgent;
    db: MementoDb;
};

export type StartAsyncAgentsResults = Promise<string>;

export function startAsyncAgentActions(
    { synopsisAgent, xchgId, continuityAgent, db }: StartAsyncAgentsArgs)
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

    if (!!continuityAgent) {
        promise = promise.then(async () => {
            const response = continuityAgent.run();
            return (await response).content;
        });
    }

    return promise;
}
