// Path: packages/conversation/src/openai.ts
import type { Message, Role } from "@memento-ai/types";
import type { ConversationInterface, SendMessageArgs } from "./conversation";
import { type ConversationOptions } from './factory';
import { Writable } from 'stream';

export class OpenAIConversation implements ConversationInterface {
    private model: string;
    private stream?: Writable;

    constructor(options: ConversationOptions) {
        this.model = options.model;
        this.stream = options.stream;
    }

    async sendMessage(args: SendMessageArgs): Promise<Message> {
        // Validate and prepare the messages
        const preparedMessages = this.prepareMessages(args);
        args.messages = preparedMessages;

        // Make the API request to OpenAI
        return await this.sendRequest(args);
    }

    private prepareMessages(args: SendMessageArgs): Message[] {
        // Add the system prompt if provided
        const { prompt, messages } = args;
        if (prompt) {
            // This is the only place where we'd like to have 'system' as a valid Role.
            // We do this awkward casting to bypass the Typescript error, which seems
            // acceptable since we only have to do it once, here.
            const role: Role = 'system' as unknown as Role;
            messages.unshift({ role, content: prompt });
        }
        return messages;
    }

    private async sendRequest(args: SendMessageArgs): Promise<Message> {
        // Make the API request to OpenAI
        // Use the this.apiKey and this.model
        // Include the prepared messages (which may contain a 'system' role message)
        // If this.stream is provided, enable streaming and forward the responses to the stream
        // If this.stream is not provided, wait for the complete response

        const message: Message = { role: 'assistant', content: 'Hello from OpenAI!' };
        return message;
    }
}