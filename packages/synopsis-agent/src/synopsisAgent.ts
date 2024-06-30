// Path: packages/synopsis-agent/src/synopsisAgent.ts

import { Agent, type AgentArgs } from '@memento-ai/agent'
import type { Config } from '@memento-ai/config'
import { createConversationFromConfig } from '@memento-ai/conversation'
import { count_tokens } from '@memento-ai/encoding'
import { MementoDb, getSynopses, type GetSynopsesArgs } from '@memento-ai/memento-db'
import { get_last_assistant_message, get_last_user_message } from '@memento-ai/postgres-db'
import { Message } from '@memento-ai/types'
import { stripCommonIndent } from '@memento-ai/utils'
import c from 'ansi-colors'
import debug from 'debug'
import { synopsisPromptTemplate } from './synopsis-prompt-template'

const dlog = debug('synopsis')

export type SynopsisAgentArgs = AgentArgs & {
    db: MementoDb
    max_tokens: number
    max_response_tokens: number
}

export class SynopsisAgent extends Agent {
    private db: MementoDb
    private max_tokens: number
    private max_response_tokens: number

    constructor(args: SynopsisAgentArgs) {
        super(args)
        this.db = args.db
        this.max_tokens = args.max_tokens
        this.max_response_tokens = args.max_response_tokens
        if (this.max_tokens < 500) {
            throw new Error('synopsis max_tokens must be at least 500')
        }
    }

    async run(): Promise<string> {
        const content = stripCommonIndent(`
            Generate the synopsis as instructed.
            Remember: Use first person plural tense, with a shared perspective.
            Remember: Be concise. No helpful commentary. One sentence. Under 50 tokens.
        `)
        const response = await this.send({ content })
        const tokens = count_tokens(response.content)
        dlog(c.green(`tokens:${tokens}, synopsis:${response.content}`))
        return response.content
    }

    async getSynopses(): Promise<string[]> {
        const args: GetSynopsesArgs = {
            max_response_tokens: this.max_response_tokens,
            max_tokens: this.max_tokens,
        }
        return await getSynopses(this.db.readonlyPool, args)
    }

    private async getLatestUserMessage(): Promise<Message> {
        return await get_last_user_message(this.db.readonlyPool)
    }

    private async getLatestAssistantMessage(): Promise<Message> {
        return await get_last_assistant_message(this.db.readonlyPool)
    }

    async generatePrompt(): Promise<string> {
        const synopses = await this.getSynopses()
        const user = (await this.getLatestUserMessage()).content
        const assistant = (await this.getLatestAssistantMessage()).content
        return synopsisPromptTemplate({ synopses, user, assistant })
    }
}

export async function createSynopsisAgent(config: Config, db: MementoDb): Promise<SynopsisAgent | undefined> {
    const conversation = createConversationFromConfig(config.synopsis_agent)
    if (conversation == undefined) {
        return undefined
    }
    const agentArgs: SynopsisAgentArgs = {
        db,
        conversation,
        max_tokens: config.synopsis_agent.max_tokens,
        max_response_tokens: config.synopsis_agent.max_response_tokens,
    }
    return new SynopsisAgent(agentArgs)
}
