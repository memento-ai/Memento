// Path: packages/resolution-agent/src/resolutionAgent.ts

import { Agent, type AgentArgs } from '@memento-ai/agent';
import { get_last_assistant_message, get_last_user_message } from '@memento-ai/postgres-db';
import { Message } from '@memento-ai/types';
import debug from 'debug';
import c from 'ansi-colors';
import { count_tokens } from '@memento-ai/encoding';
import { stripCommonIndent } from '@memento-ai/utils';
import { resolutionPromptTemplate } from './resolutionPromptTemplate';
import { lastUserMessageTemplate } from './resolutionLastUserMessage';

const dlog = debug('synopsis');

export type ResolutionAgentArgs = AgentArgs;

export class ResolutionAgent extends Agent {
    constructor(args: ResolutionAgentArgs) {
        super(args);
    }

    async run(): Promise<string> {
        const user = (await this.getLatestUserMessage()).content;
        const asst = (await this.getLatestAssistantMessage()).content;
        const content = lastUserMessageTemplate({user, asst});
        const response = await this.send({content});
        const tokens = count_tokens(response.content);
        dlog(c.green(`tokens:${tokens}, synopsis:${response.content}`));
        return response.content;
    }

    private async getLatestUserMessage(): Promise<Message> {
        return await get_last_user_message(this.DB.readonlyPool);
    }

    private async getLatestAssistantMessage(): Promise<Message> {
        return await get_last_assistant_message(this.DB.readonlyPool);
    }

    async generatePrompt(): Promise<string> {
        return resolutionPromptTemplate({});
    }
}
