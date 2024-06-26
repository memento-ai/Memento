// Path: packages/conversation/src/factory.ts

import type { ConversationConfig } from '@memento-ai/config'
import type { AssistantMessage } from '@memento-ai/types'
import { getMementoProjectRoot } from '@memento-ai/utils'
import dayjs from 'dayjs'
import fs from 'fs'
import { mkdir } from 'node:fs/promises'
import { Writable } from 'stream'
import { AnthropicConversation } from './anthropic'
import type { ConversationInterface, SendMessageArgs } from './conversation'
import { GoogleConversation } from './google'
import { GroqConversation } from './groq'
import { loggingTemplate } from './loggingTemplate'
import { MockConversation } from './mock'
import { OllamaConversation } from './ollama'
import { OpenAIConversation } from './openai'
import { isProvider, type Provider } from './provider'

export interface Logging {
    name: string
}

// Our Conversation abstraction is created from just the provider and the model.
// The stream argument is uses to enable streaming response.
// We do not specify the system prompt when we create a conversation
// because we will dynamically change the prompt with each new message.
// We do not specify an apiKey here as all providers will take the key from the environment
export type ConversationOptions = {
    model: string
    stream?: Writable
    temperature?: number
    max_response_tokens?: number
    seed?: number // Ollama only?

    logging?: Logging
}

export function withLogger(conversation: ConversationInterface, path: string): ConversationInterface {
    async function sendMessage(args: SendMessageArgs): Promise<AssistantMessage> {
        const { prompt, messages } = args
        const response: AssistantMessage = await conversation.sendMessage(args)
        const loggingData: string = loggingTemplate({ prompt, messages: [...messages, response] })

        const datestring = dayjs().format('YYYY-MM-DD')
        const root = getMementoProjectRoot()
        const fullPath = `${root}/logs/${path}/${datestring}`
        await mkdir(fullPath, { recursive: true })

        const hm = dayjs().format('HH:mm')
        const file = fs.createWriteStream(`${fullPath}/${hm}.md`, { flags: 'a' })
        file.write(loggingData)
        file.close()

        return response
    }

    return { sendMessage }
}

export function _createConversation(provider: Provider, options: ConversationOptions): ConversationInterface {
    switch (provider) {
        case 'anthropic':
            return new AnthropicConversation(options)
        case 'google':
            return new GoogleConversation(options)
        case 'groq':
            return new GroqConversation(options)
        case 'mock':
            return new MockConversation(options)
        case 'ollama':
            return new OllamaConversation(options)
        case 'openai':
            return new OpenAIConversation(options)
        default:
            throw new Error('Invalid provider')
    }
}

export function createConversation(provider: Provider, options: ConversationOptions): ConversationInterface {
    const name = options.logging?.name ?? 'default'
    const path = `${name}/${provider}/${options.model}`
    const conversation = _createConversation(provider, options)
    return withLogger(conversation, path)
}

export function createConversationFromConfig(
    config: ConversationConfig,
    stream?: Writable
): ConversationInterface | undefined {
    const { provider, model, temperature, role } = config
    if (provider === 'none') {
        return undefined
    }
    if (!isProvider(provider)) {
        throw new Error(`Invalid provider: ${provider}`)
    }
    const conversationOptions: ConversationOptions = {
        model,
        stream,
        logging: { name: role },
        temperature,
    }
    return createConversation(provider, conversationOptions)
}
