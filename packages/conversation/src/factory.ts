// Path: packages/conversation/src/factory.ts
import { AnthropicConversation } from "./anthropic";
import { OpenAIConversation } from "./openai";
import { OllamaConversation } from "./ollama";
import { MockConversation } from "./mock";
import { Writable } from 'stream';
import type { ConversationInterface, SendMessageArgs } from "./conversation";
import type { Message } from "@memento-ai/types";
import fs from 'fs';
import { mkdir } from "node:fs/promises";
import dayjs from 'dayjs';

export interface Logging {
    name: string;
}



// Our Conversation abstraction is created from just the provider and the model.
// The stream argument is uses to enable streaming response.
// We do not specify the system prompt when we create a conversation
// because we will dynamically change the prompt with each new message.
// We do not specify an apiKey here as all providers will take the key from the environment
export type ConversationOptions = {
    model: string;
    stream?: Writable;
    temperature?: number;
    max_response_tokens?: number;
    seed?: number;          // Ollama only?

    logging?: Logging;
}

export function withLogger(conversation: ConversationInterface, path: string): ConversationInterface {

    async function sendMessage(args: SendMessageArgs): Promise<Message> {
        const { prompt, messages } = args;
        const response: Message = await conversation.sendMessage(args);

        const fullPath = `logs/${path}`;
        await mkdir(fullPath, { recursive: true });

        const datestring = dayjs().format('YYYY-MM-DD');
        const file = fs.createWriteStream(`${fullPath}/${datestring}.md`, { flags: 'a' });

        file.write("## Prompt:\n" + prompt + '\n');
        file.write("## Messages:\n");
        for (const message of messages) {
            file.write(`### ${message.role}:\n`);
            file.write(message.content + '\n');
        }
        file.write("## Response:\n" + response.content + '\n');
        file.write("---\n");

        file.close();

        return response;
    }

    return { sendMessage };
}


export type Provider = 'openai' | 'anthropic' | 'ollama' | 'mock';

export function _createConversation(provider: Provider, options: ConversationOptions): ConversationInterface {
    switch (provider) {
        case 'anthropic': return new AnthropicConversation(options);
        case 'ollama': return new OllamaConversation(options);
        case 'openai': return new OpenAIConversation(options);
        case 'mock': return new MockConversation(options);
        default: throw new Error('Invalid provider');
    }
}

export function createConversation(provider: Provider, options: ConversationOptions): ConversationInterface {
    const name = options.logging?.name ?? 'default';
    const path = `${name}/${provider}/${options.model}`;
    const logging = options.logging ?? { name: provider };
    const conversation = _createConversation(provider, options);
    return withLogger(conversation, path);
}
