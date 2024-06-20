// Path: packages/memento-agent/src/factory.ts

import type { Config } from '@memento-ai/config'
import { createConversationFromConfig } from '@memento-ai/conversation'
import { MementoDb, createMementoDbFromConfig } from '@memento-ai/memento-db'
import { ResolutionAgent, createResolutionAgent } from '@memento-ai/resolution-agent'
import { SynopsisAgent, createSynopsisAgent } from '@memento-ai/synopsis-agent'
import type { Writable } from 'node:stream'
import { MementoAgent, type MementoAgentArgs } from './mementoAgent'

export type MementoAgentExtraArgs = {
    synopsisAgent?: SynopsisAgent
    resolutionAgent?: ResolutionAgent
    outStream?: Writable
}

export async function createMementoAgent(
    config: Config,
    db: MementoDb,
    extra: MementoAgentExtraArgs
): Promise<MementoAgent> {
    const { synopsisAgent, resolutionAgent, outStream } = extra
    const conversation = createConversationFromConfig(config.memento_agent, outStream)
    if (conversation == undefined) {
        throw new Error('MementoAgent requires a conversation provider.')
    }
    const agentArgs: MementoAgentArgs = {
        db,
        conversation,
        synopsisAgent,
        resolutionAgent,
        outStream,
        config,
    }
    return new MementoAgent(agentArgs)
}

export type MementoSystem = {
    db: MementoDb
    mementoAgent: MementoAgent
    synopsisAgent?: SynopsisAgent
    resolutionAgent?: ResolutionAgent
}

export async function createMementoSystem(config: Config, outStream?: Writable): Promise<MementoSystem> {
    const db = await createMementoDbFromConfig(config)
    const synopsisAgent = await createSynopsisAgent(config, db)
    const resolutionAgent = await createResolutionAgent(config, db)
    const mementoAgent = await createMementoAgent(config, db, { synopsisAgent, resolutionAgent, outStream })
    return { db, mementoAgent, synopsisAgent, resolutionAgent }
}
