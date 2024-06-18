// Path: packages/conversation/src/google.test.ts

import { USER } from '@memento-ai/types'
import { describe, expect, test } from 'bun:test'
import type { SendMessageArgs } from './conversation'
import { createConversation, type ConversationOptions } from './factory'

const provider = 'google'
const model = 'gemini-1.5-flash-latest'
const options: ConversationOptions = { model, temperature: 0.0, max_response_tokens: 64 }

const prompt = 'Answer all questions concisely, i.e give the shortest possible answer. Omit punctuation where possible.'

describe('Google', () => {
    test('Fingers on one hand', async () => {
        const conversation = createConversation(provider, options)

        const args: SendMessageArgs = {
            prompt,
            messages: [
                {
                    role: USER,
                    content: 'How many fingers on one hand?',
                },
            ],
        }
        const message = await conversation.sendMessage(args)

        const expected = '5'
        expect(message.content.trim()).toBe(expected)
    })
})
