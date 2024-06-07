// Path: packages/resolution-agent/src/resolutionAgent.ts

import { Agent, type AgentArgs } from '@memento-ai/agent';
import { getSynopses } from '@memento-ai/memento-db';
import { get_last_assistant_message, get_last_user_message } from '@memento-ai/postgres-db';
import { Message } from '@memento-ai/types';
import debug from 'debug';
import c from 'ansi-colors';
import { count_tokens } from '@memento-ai/encoding';
import { stripCommonIndent } from '@memento-ai/utils';
import { resolutionPromptTemplate } from './resolutionPromptTemplate';

const dlog = debug('synopsis');

export type ResolutionAgentArgs = AgentArgs;

export class ResolutionAgent extends Agent {
    constructor(args: ResolutionAgentArgs) {
        super(args);
    }

    async run(): Promise<string> {
        const content = stripCommonIndent(`
            As instructed, analyze the assistant's response to determine if the assistant made a commitment that should be remembered in the future.
            Response as instructed.
        `)
        const response = await this.send({content});
        const tokens = count_tokens(response.content);
        dlog(c.green(`tokens:${tokens}, synopsis:${response.content}`));
        return response.content;
    }

    private async getResolutions(): Promise<string[]> {
        return await getResolutions(this.DB.readonlyPool, 1000);
    }

    private async getLatestUserMessage(): Promise<Message> {
        return await get_last_user_message(this.DB.readonlyPool);
    }

    private async getLatestAssistantMessage(): Promise<Message> {
        return await get_last_assistant_message(this.DB.readonlyPool);
    }

    async generatePrompt(): Promise<string> {
        const resolutions = await this.getResolutions();
        const user = (await this.getLatestUserMessage()).content;
        const assistant = (await this.getLatestAssistantMessage()).content;
        return resolutionPromptTemplate({resolutions, user, assistant});
    }
}
