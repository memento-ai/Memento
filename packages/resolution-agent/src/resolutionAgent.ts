// Path: packages/resolution-agent/src/resolutionAgent.ts

import { Agent, type AgentArgs } from '@memento-ai/agent'
import type { Config } from '@memento-ai/config'
import { createConversationFromConfig } from '@memento-ai/conversation'
import type { MementoDb } from '@memento-ai/memento-db'
import { get_last_assistant_message, get_last_user_message } from '@memento-ai/postgres-db'
import { Message } from '@memento-ai/types'
import { lastUserMessageTemplate } from './resolutionLastUserMessage'
import { resolutionPromptTemplate } from './resolutionPromptTemplate'

export type ResolutionAgentArgs = AgentArgs & { db: MementoDb }

export class ResolutionAgent extends Agent {
    private db: MementoDb

    constructor(args: ResolutionAgentArgs) {
        super(args)
        this.db = args.db
    }

    async run(): Promise<string> {
        const user = (await this.getLatestUserMessage()).content
        const asst = (await this.getLatestAssistantMessage()).content
        const content = lastUserMessageTemplate({ user, asst })

        const response = await this.send({ content })
        return response.content
    }

    private async getLatestUserMessage(): Promise<Message> {
        return await get_last_user_message(this.db.readonlyPool)
    }

    private async getLatestAssistantMessage(): Promise<Message> {
        return await get_last_assistant_message(this.db.readonlyPool)
    }

    async generatePrompt(): Promise<string> {
        const resolutions = await this.db.getResolutions()
        return resolutionPromptTemplate({ resolutions })
    }
}

export async function createResolutionAgent(config: Config, db: MementoDb): Promise<ResolutionAgent | undefined> {
    const conversation = createConversationFromConfig(config.resolution_agent)
    if (conversation == undefined) {
        return undefined
    }
    const agentArgs: ResolutionAgentArgs = {
        db,
        conversation,
    }
    return new ResolutionAgent(agentArgs)
}
