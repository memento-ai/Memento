// Path: packages/conversation/src/groq.ts

import { ASSISTANT, type AssistantMessage, type Message, type Role } from "@memento-ai/types";
import type { ConversationInterface, SendMessageArgs } from "./conversation";
import { type ConversationOptions } from './factory';
import { Writable } from 'stream';
import Groq from 'groq-sdk';
import type { Stream } from "groq-sdk/lib/streaming.mjs";
import type { ChatCompletionChunk } from "groq-sdk/lib/chat_completions_ext";

export class GroqConversation implements ConversationInterface {
    private model: string;
    private stream?: Writable;
    private client: Groq;

    constructor(options: ConversationOptions) {
        this.model = options.model ?? 'mixtral-8x7b-32768';
        this.stream = options.stream;
        this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }

    async sendMessage(args: SendMessageArgs): Promise<AssistantMessage> {
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

    private async sendRequest(args: SendMessageArgs): Promise<AssistantMessage> {
        // Make the API request to Groq
        // Use the this.apiKey and this.model
        // Include the prepared messages (which may contain a 'system' role message)
        // If this.stream is provided, enable streaming and forward the responses to the stream
        // If this.stream is not provided, wait for the complete response

        const stream = !!this.stream;

        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages: args.messages,
            stream,
        });

        if (stream) {
            const chunks: string[] = [];
            const completionStream = completion as Stream<ChatCompletionChunk>;
            for await (const chunk of completionStream) {
                const data = chunk.choices[0]?.delta?.content || '';
                chunks.push(data);
                (this.stream as Writable).write(data);
            }
            return { role: ASSISTANT, content: chunks.join('') };
        } else {
            const completionResponse = completion as Groq.Chat.Completions.ChatCompletion;
            const { content } = completionResponse.choices[0].message;
            const content_ = content as string;
            return { role: ASSISTANT, content: content_ };
        }
    }
}
