// Path: packages/conversation/src/ollama.ts

import { ASSISTANT, AssistantMessage, type Message, type Role } from '@memento-ai/types'
import debug from 'debug'
import { Ollama, type ChatResponse, type Options } from 'ollama'
import { Writable } from 'stream'
import type { ConversationInterface, SendMessageArgs } from './conversation'
import { type ConversationOptions } from './factory'

const dlog = debug('ollama')

export interface ChatSessionArgs {
    model: string
    temperature?: number
    max_response_tokens?: number
    outStream?: Writable
    seed?: number // Ollama only
}

export interface ChatSession {
    client: Ollama
    model: string
    temperature: number
    max_response_tokens: number
    seed?: number
    outStream?: Writable
}

export function createChatSession(args: ChatSessionArgs): ChatSession {
    const { model, temperature, max_response_tokens } = args
    const session: ChatSession = {
        client: new Ollama({}),
        model: model ?? 'dolphin-phi',
        temperature: temperature ?? 1.0,
        max_response_tokens: max_response_tokens ?? 1024,
        outStream: args.outStream,
        seed: args.seed,
    }
    return session
}
export class OllamaConversation implements ConversationInterface {
    private model: string
    private stream?: Writable
    private session: ChatSession

    constructor(options: ConversationOptions) {
        this.model = options.model
        this.stream = options.stream

        const args: ChatSessionArgs = {
            model: this.model,
            outStream: this.stream,
            temperature: options.temperature ?? 1.0,
            max_response_tokens: options.max_response_tokens ?? 1024,
            seed: options.seed,
        }

        this.session = createChatSession(args)
    }

    async sendMessage(args: SendMessageArgs): Promise<AssistantMessage> {
        // Validate and prepare the messages
        const preparedMessages = this.prepareMessages(args)
        args.messages = preparedMessages

        // Make the API request to OpenAI
        return await this.sendRequest(args)
    }

    private prepareMessages(args: SendMessageArgs): Message[] {
        // Add the system prompt if provided
        const { prompt, messages } = args
        if (prompt) {
            // This is the only place where we'd like to have 'system' as a valid Role.
            // We do this awkward casting to bypass the Typescript error, which seems
            // acceptable since we only have to do it once, here.
            const role: Role = 'system' as unknown as Role
            messages.unshift({ role, content: prompt })
        }
        return messages
    }

    private async sendRequest(args: SendMessageArgs): Promise<AssistantMessage> {
        // Make the API request to OpenAI
        // Use the this.apiKey and this.model
        // Include the prepared messages (which may contain a 'system' role message)
        // If this.stream is provided, enable streaming and forward the responses to the stream
        // If this.stream is not provided, wait for the complete response

        const options: Partial<Options> = {
            seed: this.session.seed,
            temperature: this.session.temperature,
            num_predict: this.session.max_response_tokens,
        }

        const body = {
            model: this.model,
            messages: args.messages,
            options,
        }

        dlog(body)

        if (this.stream) {
            const outStream = this.stream as Writable
            const eventStream = await this.session.client.chat({ ...body, stream: true })
            const parts: string[] = []
            for await (const event of eventStream) {
                const { message } = event
                const { content } = message
                outStream.write(content)
                parts.push(content)
            }
            outStream.write('\n')
            const content = parts.join('') + '\n'
            return { role: ASSISTANT, content }
        } else {
            const response: ChatResponse = await this.session.client.chat(body)
            const { message } = response
            const { content } = message
            return { role: ASSISTANT, content }
        }
    }
}
