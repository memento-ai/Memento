// Path: packages/conversation/src/anthropic.ts

import Anthropic from '@anthropic-ai/sdk'
import type { MessageCreateParams, MessageDeltaUsage, MessageStream } from '@anthropic-ai/sdk/resources/messages.mjs'
import { ASSISTANT, AssistantMessage, USER, type Message } from '@memento-ai/types'
import debug from 'debug'
import { Writable } from 'node:stream'
import { getModel } from './anthropic_models'
import { type ConversationInterface, type SendMessageArgs } from './conversation'
import { type ConversationOptions } from './factory'

const dlog = debug('anthropic')
const ulog = debug('anthropic:usage')

type ChatMessage = Anthropic.Messages.MessageParam
type ChatMessages = ChatMessage[]

function asClaude(message: Message): ChatMessage {
    return {
        content: message.content,
        role: message.role === ASSISTANT ? ASSISTANT : USER,
    }
}

function asClaudeMessages(messages: Message[]): ChatMessages {
    return messages.map(asClaude)
}

export interface ChatSessionArgs {
    model?: string
    temperature?: number
    max_response_tokens?: number
    outStream?: Writable
}

export interface ChatSession {
    anthropic: Anthropic
    model: string
    temperature: number
    max_response_tokens: number
    outStream?: Writable
}

export function createChatSession(args: ChatSessionArgs = {}): ChatSession {
    const model = getModel(args.model)
    const temperature = args.temperature ?? 1.0
    const max_response_tokens = args.max_response_tokens ?? 3000
    const session: ChatSession = {
        anthropic: new Anthropic({}), // use the api key from the environment
        model,
        temperature,
        max_response_tokens,
        outStream: args.outStream,
    }
    return session
}

export interface ChatStreamingArgs {
    session: ChatSession
    messages: ChatMessage[]
    system: string
    outStream: Writable
}

function logBadMessages(messages: Message[]) {
    debug.enable('anthropic')
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i]
        dlog(`At index ${i}: ${message.role}: ${message.content}`)
    }
}

export class AnthropicConversation implements ConversationInterface {
    private model: string
    private stream?: Writable
    private session: ChatSession

    constructor(options: ConversationOptions) {
        this.model = getModel(options.model)
        this.stream = options.stream

        const args: ChatSessionArgs = {
            model: this.model,
            outStream: this.stream,
            temperature: options.temperature ?? 1.0,
            max_response_tokens: options.max_response_tokens ?? 3000,
        }

        this.session = createChatSession(args)
    }

    async sendMessage(args: SendMessageArgs): Promise<AssistantMessage> {
        // Validate and prepare the messages

        const { messages } = args
        if (messages.length === 0) {
            throw new Error('No messages to send')
        }
        if (messages.length % 2 === 0) {
            logBadMessages(messages)
            throw new Error('Messages must have an odd number of entries')
        }
        if (messages[messages.length - 1].role !== USER) {
            logBadMessages(messages)
            throw new Error('Last message must be from the user')
        }
        for (let i = 0; i < messages.length - 1; i++) {
            const role = i % 2 === 0 ? USER : ASSISTANT
            if (messages[i].role !== role) {
                console.error(`At index ${i}: ${messages[i].role} !== ${role}`)
                logBadMessages(messages)
                throw new Error('Roles are not alternating')
            }
        }

        const message: AssistantMessage = await this.sendRequest(args)
        return message
    }

    private async sendRequest(args: SendMessageArgs): Promise<AssistantMessage> {
        const { prompt, messages: messages_ } = args
        const messages = asClaudeMessages(messages_)
        const streaming = !!this.stream
        const body: MessageCreateParams = {
            max_tokens: this.session.max_response_tokens,
            messages,
            model: this.session.model,
            stream: streaming,
            system: prompt,
            temperature: this.session.temperature,
        }
        dlog(body)
        let response: Anthropic.Messages.Message
        if (!body.stream) {
            response = await this.session.anthropic.messages.create(body)
        } else {
            const outStream = this.stream as Writable
            const eventStream: MessageStream = this.session.anthropic.messages.stream(body)
            let event: Anthropic.Messages.MessageStreamEvent
            let usage: MessageDeltaUsage = { output_tokens: 0 }
            for await (event of eventStream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    outStream.write(event.delta.text)
                } else if (event.type === 'message_delta') {
                    usage = event.usage
                }
            }
            outStream.write('\n')
            response = await eventStream.finalMessage()
            const { output_tokens } = usage
            const { input_tokens } = response.usage
            ulog('usage:', { input_tokens, output_tokens })
        }
        const content = response.content.map((item) => item.text).join('')
        const message: AssistantMessage = {
            role: ASSISTANT,
            content,
        }
        dlog('sendRequest response message:', message)
        return message
    }
}
