// Path: packages/conversation/src/mock.ts

import { ASSISTANT, type AssistantMessage } from '@memento-ai/types'
import type { ConversationInterface, SendMessageArgs } from './conversation'
import { type ConversationOptions } from './factory'

export class MockConversation implements ConversationInterface {
    private opts: ConversationOptions
    constructor(opts: ConversationOptions) {
        this.opts = opts
    }

    async sendMessage(args: SendMessageArgs): Promise<AssistantMessage> {
        // This "mock" is maybe more of a "dummy" than a mock,
        // as as it provides very miminal ability for a test to manipulate its behavior.
        // For now it just echoes back the last message in the conversation history.
        const lastMessage = args.messages[args.messages.length - 1]
        return { role: ASSISTANT, content: lastMessage.content }
    }
}
