// Path: packages/system/src/factory.ts

import { Config, ConversationConfig } from "@memento-ai/config";
import { createConversation as convCreateConversation, isProvider } from "@memento-ai/conversation";
import { MementoAgent, type MementoAgentArgs } from "@memento-ai/memento-agent";
import { MementoDb } from "@memento-ai/memento-db";
import { ResolutionAgent } from "@memento-ai/resolution-agent";
import { SynopsisAgent } from "@memento-ai/synopsis-agent";
import type { AgentArgs } from "@memento-ai/agent";
import type { ConversationInterface, ConversationOptions } from "@memento-ai/conversation";
import type { Writable } from 'node:stream';

export type MementoSystem = {
    db: MementoDb;
    mementoAgent: MementoAgent;
    synopsisAgent?: SynopsisAgent;
    resolutionAgent?: ResolutionAgent;
}

export async function createMementoDb(config: Config): Promise<MementoDb> {
    return await MementoDb.create(config.database);
}

export function createConversation(config: ConversationConfig, stream?: Writable): ConversationInterface | undefined {
    const { provider, model, temperature, role } = config;
    if (provider === 'none') {
        return undefined;
    }
    if (!isProvider(provider)) {
        throw new Error(`Invalid provider: ${provider}`);
    }
    const conversationOptions: ConversationOptions = {
        model,
        stream,
        logging: { name: role },
        temperature
    };
    return convCreateConversation(provider, conversationOptions);
}

export async function createSynopsisAgent(config: Config, db: MementoDb): Promise<SynopsisAgent | undefined> {
    const conversation = createConversation(config.synopsis_agent);
    if (conversation == undefined) {
        return undefined;
    }
    const agentArgs: AgentArgs = {
        db,
        conversation
    };
    return new SynopsisAgent(agentArgs);
}

export async function createResolutionAgent(config: Config, db: MementoDb): Promise<ResolutionAgent | undefined> {
    const conversation = createConversation(config.synopsis_agent);
    if (conversation == undefined) {
        return undefined;
    }
    const agentArgs: AgentArgs = {
        db,
        conversation
    };
    return new ResolutionAgent(agentArgs);
}

export type MementoAgentExtraArgs =  {
    synopsisAgent?: SynopsisAgent;
    resolutionAgent?: ResolutionAgent;
    outStream?: Writable;
}

export async function createMementoAgent(config: Config, db: MementoDb, extra : MementoAgentExtraArgs): Promise<MementoAgent> {
    const { synopsisAgent, resolutionAgent, outStream } = extra;
    const conversation = createConversation(config.memento_agent, outStream);
    if (conversation == undefined) {
        throw new Error('MementoAgent requires a conversation provider.');
    }
    const agentArgs: MementoAgentArgs = {
        db,
        conversation,
        synopsisAgent,
        resolutionAgent,
        outStream,
        config
    };
    return new MementoAgent(agentArgs);
}

export async function createMementoSystem(config: Config, outStream?: Writable): Promise<MementoSystem> {
    const db = await createMementoDb(config);
    const synopsisAgent = await createSynopsisAgent(config, db);
    const resolutionAgent = await createResolutionAgent(config, db);
    const mementoAgent = await createMementoAgent(config, db, {synopsisAgent, resolutionAgent, outStream});
    return { db, mementoAgent, synopsisAgent, resolutionAgent };
}
