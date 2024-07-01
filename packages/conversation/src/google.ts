// Path: packages/conversation/src/google.ts

import type {
    EnhancedGenerateContentResponse,
    GenerateContentStreamResult,
    GenerationConfig,
    GenerativeModel,
    ChatSession as GooogleChatSession,
    StartChatParams,
} from '@google/generative-ai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ASSISTANT, AssistantMessage, Message, USER } from '@memento-ai/types'
import debug from 'debug'
import type { ConversationInterface, SendMessageArgs } from './conversation'
import type { ConversationOptions } from './factory'
import { PolyfillTextDecoderStream } from './polyfillTextDecoderStream'
const dlog = debug('google')

dlog(!!PolyfillTextDecoderStream)

export interface ChatSessionArgs {
    model?: string
    temperature?: number
    max_response_tokens?: number
}

export interface ChatSession {
    client: GoogleGenerativeAI
    model: string
    temperature: number
    max_response_tokens: number
}

export function createChatSession(args: ChatSessionArgs): ChatSession {
    const { temperature, max_response_tokens } = args
    const key: string | undefined = process.env.GOOGLE_API_KEY
    if (key === undefined) {
        throw new Error('GOOGLE_API_KEY is not set')
    }

    const client = new GoogleGenerativeAI(key)
    const model = args.model ?? 'models/gemini-1.5-flash-latest'

    const session: ChatSession = {
        client,
        model,
        temperature: temperature ?? 1.0,
        max_response_tokens: max_response_tokens ?? 2048,
    }
    return session
}
export class GoogleConversation implements ConversationInterface {
    private model: string
    private session: ChatSession

    constructor(options: ConversationOptions) {
        this.model = options.model

        const args: ChatSessionArgs = {
            model: this.model,
            temperature: options.temperature ?? 0.25,
            max_response_tokens: options.max_response_tokens ?? 3000,
        }

        this.session = createChatSession(args)
    }

    async sendMessage(args: SendMessageArgs): Promise<AssistantMessage> {
        const { prompt, messages, stream } = args

        dlog(`Sending message to Google with prompt: ${prompt}`)
        dlog(`Messages: ${Bun.inspect(messages)}`)

        const model: GenerativeModel = this.session.client.getGenerativeModel({
            model: this.model,
            systemInstruction: prompt,
        })

        const lastMessage = messages[messages.length - 1]
        const { role, content } = lastMessage
        if (role !== USER) {
            throw new Error('The last message in the conversation history must be from the user.')
        }

        const history = messages.slice(0, messages.length - 1).map((message: Message) => {
            return {
                role: message.role === USER ? USER : 'model',
                parts: [{ text: message.content }],
            }
        })

        const generationConfig: GenerationConfig = {
            maxOutputTokens: this.session.max_response_tokens,
            temperature: this.session.temperature,
        }

        const startChatParams: StartChatParams = { history, generationConfig }

        let result: AssistantMessage = { role: ASSISTANT, content: '' }
        try {
            const chat: GooogleChatSession = model.startChat(startChatParams)

            // Make the API request to Google
            const r: GenerateContentStreamResult = await chat.sendMessageStream(content)

            let check = ''
            if (stream) {
                for await (const chunk of r.stream) {
                    const chunkText = chunk.text()
                    check += chunkText
                    stream.write(chunkText)
                }
                stream.end()
            }

            const response: EnhancedGenerateContentResponse = await r.response

            const text = response.text()
            if (stream && text != check) {
                console.error(`Mismatch between streamed and response text!`)
                console.error(`text: ${text}`)
                console.error(`check: ${check}`)
            }

            if (!text) {
                const { candidates, promptFeedback, usageMetadata } = response
                console.error(Bun.inspect({ candidates, promptFeedback, usageMetadata }))
                console.error(`Received empty response from Google!`)
            }

            result = { role: ASSISTANT, content: text }
        } catch (error) {
            console.error('Error sending message to Google:', error)
            throw error
        }

        if (!result.content) {
            console.error(`Received empty response from Google!`)
            throw new Error('Received empty response from Google!')
        }

        return result
    }
}
