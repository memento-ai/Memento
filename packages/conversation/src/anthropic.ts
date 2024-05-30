// Path: packages/conversation/src/anthropic.ts

import { type ConversationInterface, type SendMessageArgs } from './conversation';
import { type ConversationOptions } from './factory';
import { ASSISTANT, USER, type Message, AssistantMessage } from '@memento-ai/types';
import { Writable } from 'node:stream';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages.mjs';
import debug from 'debug';

const dlog = debug('anthropic');
const ulog = debug('anthropic:usage');

const haiku = "claude-3-haiku-20240307";
const sonnet = "claude-3-sonnet-20240229";
const opus = "claude-3-opus-20240229";

const modelAliases: Record<string, string> = {
    haiku,
    opus,
    sonnet
}

function getModel(model?: string): string {
    if (!model) {
        // default to haiku for cheaper pricing
        return haiku;
    }

    // Is the string a known alias
    if (model in modelAliases) {
        return modelAliases[model];
    }

    // Is the string a known model
    const knownModels = [haiku, sonnet, opus];
    const found = knownModels.find(m => m === model);

    if (found) {
        return found;
    }

    throw new Error(`Unknown model: ${model}`);
}

type ChatMessage = Anthropic.Messages.MessageParam;
type ChatMessages = ChatMessage[];
type ResponseMessage = Anthropic.Messages.Message;
type Usage = Anthropic.Messages.Usage;

function asClaude(message: Message): ChatMessage {
    return {
        content: message.content,
        role: message.role === ASSISTANT? ASSISTANT : USER
    }
}

function asClaudeMessages(messages: Message[]): ChatMessages {
    return messages.map(asClaude);
}

export interface ChatSessionArgs {
    model?: string;
    temperature?: number;
    max_response_tokens?: number;
    outStream?: Writable;
}

export interface ChatSession {
    anthropic: Anthropic;
    model: string;
    temperature: number;
    max_response_tokens: number;
    outStream?: Writable;
}

export function createChatSession(args: ChatSessionArgs = {}): ChatSession {
    const model = getModel(args.model);
    const temperature = args.temperature ?? 1.0;
    const max_response_tokens = args.max_response_tokens ?? 3000;
    const session: ChatSession = {
        anthropic: new Anthropic({}), // use the api key from the environment
        model,
        temperature,
        max_response_tokens,
        outStream: args.outStream
    }
    return session;
}

export interface ChatStreamingArgs {
    session: ChatSession;
    messages: ChatMessage[];
    system: string;
    outStream: Writable;
}

function logBadMessages(messages: Message[]) {
    debug.enable('anthropic')
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        dlog(`At index ${i}: ${message.role}: ${message.content}`);
    }
}

export class AnthropicConversation implements ConversationInterface {
    private model: string;
    private stream?: Writable;
    private session: ChatSession;

    constructor(options: ConversationOptions) {
        this.model = getModel(options.model);
        this.stream = options.stream;

        const args: ChatSessionArgs = {
            model: this.model,
            outStream: this.stream,
            temperature: options.temperature ?? 1.0,
            max_response_tokens: options.max_response_tokens ?? 3000
        };

        this.session = createChatSession(args);
    }

    // This API assumes that all the data we want to send with the request is already
    // present in args:
    // 1. The system prompt
    // 2. The conversation history in messages
    // 3. The new user message as the last entry in messages.
    async sendMessage(args: SendMessageArgs): Promise<AssistantMessage> {
        // Validate and prepare the messages

        const { messages } = args;
        if (messages.length === 0) {
            throw new Error("No messages to send");
        }
        if (messages.length % 2 === 0) {
            logBadMessages(messages);
            throw new Error("Messages must have an odd number of entries");
        }
        if (messages[messages.length - 1].role !== USER) {
            logBadMessages(messages);
            throw new Error("Last message must be from the user");
        }
        for (let i = 0; i < messages.length - 1; i++) {
            const role = i % 2 === 0? USER : ASSISTANT;
            if (messages[i].role !== role) {
                console.error(`At index ${i}: ${messages[i].role} !== ${role}`);
                logBadMessages(messages);
                throw new Error("Roles are not alternating");
            }
        }

        // Make the API request to Anthropic
        const message: AssistantMessage = await this.sendRequest(args);
        return message;
    }

    private async sendRequest(args: SendMessageArgs): Promise<AssistantMessage> {
        const { prompt, messages: messages_ } = args;
        const messages = asClaudeMessages(messages_);
        const streaming = !!this.stream;
        const body: MessageCreateParams = {
            max_tokens: this.session.max_response_tokens,
            messages,
            model: this.session.model,
            stream: streaming,
            system: prompt,
            temperature: this.session.temperature,
        };
        dlog(body);
        let response: ResponseMessage
        if (!body.stream) {
            response = await this.session.anthropic.messages.create(body);
        } else {
            const outStream = this.stream as Writable;
            const eventStream = this.session.anthropic.messages.stream(body);
            for await (const event of eventStream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    outStream.write(event.delta.text);
                }
            }
            outStream.write('\n');
            response = await eventStream.finalMessage();
            const { usage } = response;
            ulog('usage:', usage);
        }
        const content = response.content.map(item => item.text).join("");
        const message: AssistantMessage = {
            role: ASSISTANT,
            content
        }
        dlog('sendRequest response message:', message);
        return message;
    }
}
