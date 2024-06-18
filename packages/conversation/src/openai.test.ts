// Path: packages/conversation/src/openai.test.ts

import { USER } from '@memento-ai/types'
import { expect, test } from 'bun:test'
import type { SendMessageArgs } from './conversation'
import { createConversation, type ConversationOptions } from './factory'

const model = 'gpt-3.5-turbo'
const provider = 'openai'
const options: ConversationOptions = { model, temperature: 0.0, max_response_tokens: 64, seed: 987 }

const prompt = 'Answer all questions concisely, i.e give the shortest possible answer.'

test('Hello from OpenAI!', async () => {
    const conversation = createConversation(provider, options)

    const args: SendMessageArgs = {
        prompt,
        messages: [
            {
                role: USER,
                content: 'Hi',
            },
        ],
    }
    const message = await conversation.sendMessage(args)

    expect(message.content).toInclude('Hello! How can I ')
    expect(message.content).toInclude(' you today?')
})
