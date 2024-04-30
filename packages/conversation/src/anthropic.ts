// Path: packages/conversation/src/anthropic.ts
import { type ConversationInterface, type SendMessageArgs } from './conversation';
import { type ConversationOptions } from './factory';
import { ASSISTANT, USER, type Message } from '@memento-ai/types';
import { Writable } from 'stream';
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
    const max_response_tokens = args.max_response_tokens ?? 1536;
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
            max_response_tokens: options.max_response_tokens ?? 1536
        };

        this.session = createChatSession(args);
    }

    // This API assumes that all the data we want to send with the request is already
    // present in args:
    // 1. The system prompt
    // 2. The conversation history in messages
    // 3. The new user message as the last entry in messages.
    async sendMessage(args: SendMessageArgs): Promise<Message> {
        // Validate and prepare the messages

        // Make the API request to Anthropic
        const message: Message = await this.sendRequest(args);
        return message;
    }

    private async sendRequest(args: SendMessageArgs): Promise<Message> {
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
        let usage: Usage;
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
        const message: Message = {
            role: response.role,
            content
        }
        dlog('sendRequest response message:', message);
        return message;
    }
}
