// Path: packages/memento-agent/src/synopsisAgent.ts

import { Agent, type AgentArgs } from '@memento-ai/agent';
import { type SendMessageArgs } from '@memento-ai/conversation';
import { getSynopses } from '@memento-ai/memento-db';
import { get_last_assistant_message, get_last_user_message } from '@memento-ai/postgres-db';
import { Message } from '@memento-ai/types';
import debug from 'debug';
import c from 'ansi-colors';
import { count_tokens } from '@memento-ai/encoding';

const dlog = debug('synopsis');

export class SynopsisAgent extends Agent {
    constructor(args: AgentArgs) {
        super(args);
    }

    async run(): Promise<string> {
        const synopses = await this.getSynopses();
        const userMessage = await this.constructUserMessage();
        const prompt = this.generatePrompt(synopses);
        const response = await this.sendMessage({ prompt, messages: [userMessage] });
        const tokens = count_tokens(response.content);
        dlog(c.green(`tokens:${tokens}, synopsis:${response.content}`));
        return response.content;
    }

    private async constructUserMessage(): Promise<Message> {
        const lastUserMessage = await this.getLatestUserMessage();
        const lastAssistantReply = await this.getLatestAssistantMessage();

        return {
            role: 'user',
            content: `
Respond with the synopsis for this exchange:

<user>
${lastUserMessage.content}
</user>

<assistant>
${lastAssistantReply.content}
</assistant>
`,
        };
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

    private generatePrompt(synopses: string[]): string {
        return `
You are a scribe for the 'assistant' who participates in an evolving conversation with a 'user'.
Your task is to generate a concise synopsis of one conversational exchange in which the user instructs the assistant
to perform some task or answer a question, and the assistant replies back to the user with their response.

The synopsis should be a single sentence that captures the main idea of the exchange. The sentence should be under 50 tokens
(under about 40 words). The synopsis should be written in the first person singular tense from the perspective of the
assistant. The assistant will be given a chronological record of the synopses from as many as 50 prior exchanges.
The purpose of this record is to provide the user with a sense of the conversation's history even though they will
not be able to see the detailed conversation history.

${synopses.length > 0? `For context, here are a few of synopses from the most recent exchanges: \n\n$<synopses>\n${synopses.join('\n')}\n</synopses>` : ''}

The exchange you are to summarize will be given to you in the only message below, using xml style tags to denote the user's instruction
and the assistant's reply. You should respond with only the brief synopsis of the exchange and no other commentary or
explanation.

Remember: you are writing the synopsis from the perspective of the assistant. It may help to think of
your synopsis as being the inner thought of the assistant, and the stream of synopses over an extended conversation
as being the inner monologue of the assistant.

Remember: be concise. One sentence. Under 50 tokens.
`;
    }

    async sendMessage({ prompt, messages }: SendMessageArgs): Promise<Message> {
        return this.conversation.sendMessage({ prompt, messages });
    }
}
