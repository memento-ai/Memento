// Path: packages/memento-agent/src/asyncAgentGlue.ts

import debug from "debug";
import c from 'ansi-colors';
import type { Message } from "@memento-ai/types";
import type { Agent } from "@memento-ai/agent";
import type { MementoDb } from "@memento-ai/memento-db";
import type { SynopsisAgent } from "@memento-ai/synopsis-agent";
import type { ContinuityAgent } from "../../continuity-agent";

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
    continuityAgent?: ContinuityAgent;
    db: MementoDb;
    max_message_pairs: number;
};

export type StartAsyncAgentsResults = Promise<string>;

export function startAsyncAgentActions(
    { synopsisAgent, continuityAgent, db, max_message_pairs }: StartAsyncAgentsArgs)
    : StartAsyncAgentsResults {

    let promise: Promise<string> = Promise.resolve("");

    if (!!synopsisAgent) {
        promise = synopsisAgent.run()
        .then(async (response: string) => {
            const message: Message = { content: response, role: "assistant" };
            await db.addSynopsisMem({content: message.content});
            return message.content;
        });
    }

    if (!!continuityAgent) {
        promise = promise.then(async () => {
            const messages: Message[] = await db.getConversation(max_message_pairs);
            const response = (continuityAgent as Agent).sendMessage({prompt:"", messages});
            return (await response).content;
        });
    }

    return promise;
}
