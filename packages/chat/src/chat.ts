import Anthropic from '@anthropic-ai/sdk';
import { type Message, ASSISTANT, USER } from '@memento-ai/types';
import debug from 'debug'
import { Writable } from 'node:stream';
import fs from 'node:fs';

const dlog = debug("chat");

// This is the basic message type { role: ASSISTANT, content: "Hi, I'm Claude." }
export type ChatMessage = Anthropic.Messages.MessageParam;
export type ChatMessages = ChatMessage[];

export type ResponseMessage = Anthropic.Messages.Message;

function asClaude(message: Message): ChatMessage {
    return {
        content: message.content,
        role: message.role === ASSISTANT? ASSISTANT : USER
    }
}

function asClaudeMessages(messages: Message[]): ChatMessages {
    return messages.map(asClaude);
}

// This interface is pure chat and should not include any database/postgresql dependencies
// See the mementoChat.ts API for a chat interface that includes database dependencies

export interface ChatSessionArgs {
    apiKey?: string;    // The API key for the chat session, normally obtained from the environment
    model?: string;
    temperature?: number;
    max_tokens?: number;
    outStream?: Writable;
}

  export interface ChatSession {
    anthropic: Anthropic;
    model: string;
    temperature: number;
    max_tokens: number;
    outStream?: Writable;
}

const haiku = "claude-3-haiku-20240307"; // default to haiku for cheaper pricing
const sonnet = "claude-3-sonnet-20240229";
const opus = "claude-3-opus-20240229";

const modelAliases: Record<string, string> = {
    haiku,
    opus,
    sonnet
}

export function getModel(model?: string): string {
    if (!model) {
        // Use sonnet as default
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

export function createChatSession(args: ChatSessionArgs = {}): ChatSession {
    const apiKey = args.apiKey ?? process.env.ANTHROPIC_API_KEY;
    const model = getModel(args.model);
    const temperature = args.temperature ?? 1.0;
    const max_tokens = args.max_tokens ?? 1024;
    const session: ChatSession = {
        anthropic: new Anthropic({ apiKey }), // use the api key from the environment
        model,
        temperature,
        max_tokens,
        outStream: args.outStream
    }
    return session;
}

export async function chat(session: ChatSession, messages_: Message[], system_: string[] = []): Promise<Message> {
    const system: string = system_.join("\n\n");
    const messages = asClaudeMessages(messages_);
    const body: Anthropic.Messages.MessageCreateParamsNonStreaming = {
        max_tokens: session.max_tokens,
        messages,
        model: session.model,
        stream: false,
        system,
        temperature: session.temperature,
    };
    dlog("body:", body);
    const response: ResponseMessage = await session.anthropic.messages.create(body);
    dlog("response:", response);
    const { role, content: content_array } = response;
    const content = content_array.map(item => item.text).join("\n");
    return { role, content };
}

export interface ChatStreamingArgs {
    session: ChatSession;
    messages: Message[];
    system: string[];
    outStream?: Writable;
}

export async function chatStreaming(args: ChatStreamingArgs): Promise<Message> {
    const { session, messages: messages_, outStream: outStream_, system: system_ } = args;
    const system: string = system_.join("\n\n");
    const messages = asClaudeMessages(messages_);

    // TODO: if no outStream is provided, we should instead have selected the non-streaming chat
    const outStream = outStream_ ?? fs.createWriteStream('/dev/null');

    const stream = session.anthropic.messages.stream({
        max_tokens: session.max_tokens,
        messages,
        model: session.model,
        system,
        temperature: session.temperature,
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            outStream.write(event.delta.text);
        }
    }
    outStream.write('\n');

    const response = await stream.finalMessage();

    const content = response.content.map(item => item.text).join("");

    dlog('chatStreaming final content:', content);

    const message: Message = {
        role: response.role,
        content
    }

    dlog('chatStreaming response message:', message);
    return message;
}
