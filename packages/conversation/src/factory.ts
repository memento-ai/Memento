// Path: packages/conversation/src/factory.ts

import { AnthropicConversation } from "./anthropic";
import { GroqConversation } from "./groq";
import { mkdir } from "node:fs/promises";
import { MockConversation } from "./mock";
import { OllamaConversation } from "./ollama";
import { OpenAIConversation } from "./openai";
import { Writable } from 'stream';
import dayjs from 'dayjs';
import fs from 'fs';
import type { ConversationInterface, SendMessageArgs } from "./conversation";
import type { AssistantMessage, Message } from "@memento-ai/types";
import type { Provider } from "./provider";
import { GoogleConversation } from "./google";

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

    async function sendMessage(args: SendMessageArgs): Promise<AssistantMessage> {
        const { prompt, messages } = args;
        const response: AssistantMessage = await conversation.sendMessage(args);

        const datestring = dayjs().format('YYYY-MM-DD');
        const fullPath = `logs/${path}/${datestring}`;
        await mkdir(fullPath, { recursive: true });

        const hm = dayjs().format('HH:mm');
        const file = fs.createWriteStream(`${fullPath}/${hm}.md`, { flags: 'a' });

        file.write(prompt);
        file.write("# Messages:\n");
        for (const message of messages) {
            file.write(`## ${message.role}:\n`);
            file.write(message.content + '\n');
        }
        file.write("# Response:\n" + response.content + '\n');

        file.close();

        return response;
    }

    return { sendMessage };
}

export function _createConversation(provider: Provider, options: ConversationOptions): ConversationInterface {
    switch (provider) {
        case 'anthropic': return new AnthropicConversation(options);
        case 'google': return new GoogleConversation(options);
        case 'groq': return new GroqConversation(options);
        case 'mock': return new MockConversation(options);
        case 'ollama': return new OllamaConversation(options);
        case 'openai': return new OpenAIConversation(options);
        default: throw new Error('Invalid provider');
    }
}

export function createConversation(provider: Provider, options: ConversationOptions): ConversationInterface {
    const name = options.logging?.name ?? 'default';
    const path = `${name}/${provider}/${options.model}`;
    const conversation = _createConversation(provider, options);
    return withLogger(conversation, path);
}
