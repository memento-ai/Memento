// Path: packages/conversation/src/openai.ts

import type { AssistantMessage, Message, Role } from '@memento-ai/types'
import OpenAI from 'openai'
import type { Stream } from 'openai/streaming.mjs'
import type { ConversationInterface, SendMessageArgs } from './conversation'
import { type ConversationOptions } from './factory'

export class OpenAIConversation implements ConversationInterface {
    private model: string
    private client: OpenAI
    private temperature?: number

    constructor(options: ConversationOptions) {
        this.model = options.model ?? 'gpt-3.5-turbo'
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        this.temperature = options.temperature
    }

    async sendMessage(args: SendMessageArgs): Promise<AssistantMessage> {
        // Validate and prepare the messages
        const preparedMessages = this.prepareMessages(args)
        args.messages = preparedMessages

        // Make the API request to OpenAI
        return (await this.sendRequest(args)) as AssistantMessage
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

        const stream = !!args.stream

        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages: args.messages,
            stream,
            temperature: this.temperature ?? 1.0,
        })

        if (args.stream) {
            const chunks: string[] = []
            const completionStream = completion as Stream<OpenAI.Chat.Completions.ChatCompletionChunk>
            for await (const chunk of completionStream) {
                const data = chunk.choices[0]?.delta?.content || ''
                chunks.push(data)
                args.stream.write(data)
            }
            args.stream.end()
            return { role: 'assistant', content: chunks.join('') }
        } else {
            const completionResponse = completion as OpenAI.Chat.Completions.ChatCompletion
            const { role, content } = completionResponse.choices[0].message
            const content_ = content as string
            return { role, content: content_ }
        }
    }
}
