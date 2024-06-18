// Path: packages/agent/src/agent.ts

import type { ConversationInterface, SendMessageArgs } from '@memento-ai/conversation'
import { AssistantMessage, constructUserMessage } from '@memento-ai/types'

// An Agent is a class that may represent:
// 1. a conversational agent/chatbot that interacts with the user, or
// 2. a specialized tool.

// Simple tools will be just a ConversationInterface, a prompt, and possibly a registry of one or a few callable functions.
// Examples:
// 1. The Document Summarizer

// More complex agents will have a database connection, a registry of multiple functions, and some business logic.
// Examples:
// 1. The MementoAgent agent
// 2. The Memento Conversation Summarizer run asynchronously.

export type AgentArgs = {
    conversation: ConversationInterface
}

export interface SendArgs {
    content: string
}

export abstract class Agent {
    private conversation: ConversationInterface

    constructor({ conversation }: AgentArgs) {
        this.conversation = conversation
        Object.defineProperty(this, 'send', {
            value: this.send,
            writable: false,
            configurable: false,
        })
    }

    // This method forwards the message to the conversation interface.
    // We could have used the exact same method name as in ConversationInterface,
    // and even declared that Agent implements ConversationInterface,
    // but that's not necessary and could lead to confusion.
    // Instead, we just delegate to ConversationInterface through this method.
    // All subclasses of Agent will have to call this method either directly
    // or indirectly via the send method.
    async forward({ prompt, messages }: SendMessageArgs): Promise<AssistantMessage> {
        return this.conversation.sendMessage({ prompt, messages })
    }

    // Every agent will need a prompt that is specific to the agent
    // It is useful to have a comment method for this purpose.
    abstract generatePrompt(): Promise<string>

    // This is a convenience method what will be used for simple tools with a fixed prompt and a single message (no coversation history)
    // But note that this method cannot be overridden by subclasses, as it becomes difficult to reason about behavior
    // if both send and sendMessage can be overridden.
    public async send({ content }: SendArgs): Promise<AssistantMessage> {
        const prompt = await this.generatePrompt()
        const message = constructUserMessage(content)
        return this.forward({ prompt, messages: [message] })
    }
}
