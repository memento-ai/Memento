// Path: packages/conversation/src/groq.test.ts

import { USER } from '@memento-ai/types'
import { expect, test } from 'bun:test'
import type { SendMessageArgs } from './conversation'
import { createConversation, type ConversationOptions } from './factory'

const model = 'mixtral-8x7b-32768'
const provider = 'groq'
const options: ConversationOptions = { model, temperature: 0.000001, max_response_tokens: 64, seed: 987 }

const prompt = 'Answer all questions concisely, i.e give the shortest possible answer.'

test('Hello from Groq!', async () => {
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

    console.log(message.content)
    expect(message.content).toInclude('Hello!')
}, 60000)
