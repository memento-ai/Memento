// Path: packages/synopsis-agent/src/synopsisAgent.ts

import { Agent, type AgentArgs } from '@memento-ai/agent';
import { getSynopses } from '@memento-ai/memento-db';
import { get_last_assistant_message, get_last_user_message } from '@memento-ai/postgres-db';
import { Message } from '@memento-ai/types';
import debug from 'debug';
import c from 'ansi-colors';
import { count_tokens } from '@memento-ai/encoding';
import { stripCommonIndent } from '@memento-ai/utils';
import { synopsisPromptTemplate } from './synopsis-prompt-template';

const dlog = debug('synopsis');

export type SynopsisAgentArgs = AgentArgs;

export class SynopsisAgent extends Agent {
    constructor(args: SynopsisAgentArgs) {
        super(args);
    }

    async run(): Promise<string> {
        const content = stripCommonIndent(`
            Generate the synopsis as instructed.
            Remember: Use first person plural tense, with a shared perspective.
            Remember: Be concise. One sentence. Under 50 tokens.
        `)
        const response = await this.send({content});
        const tokens = count_tokens(response.content);
        dlog(c.green(`tokens:${tokens}, synopsis:${response.content}`));
        return response.content;
    }

    private async getSynopses(): Promise<string[]> {
        return await getSynopses(this.DB.readonlyPool, 1000);
    }

    private async getLatestUserMessage(): Promise<Message> {
        return await get_last_user_message(this.DB.readonlyPool);
    }

    private async getLatestAssistantMessage(): Promise<Message> {
        return await get_last_assistant_message(this.DB.readonlyPool);
    }

    async generatePrompt(): Promise<string> {
        const synopses = await this.getSynopses();
        const user = (await this.getLatestUserMessage()).content;
        const assistant = (await this.getLatestAssistantMessage()).content;
        return synopsisPromptTemplate({synopses, user, assistant});
    }
}
