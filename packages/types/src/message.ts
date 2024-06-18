// Path: packages/types/src/message.ts

import { z } from 'zod'
import { ASSISTANT, Role, USER } from './role'

export const Message = z.object({
    content: z.string(),
    role: Role,
})
export type Message = z.TypeOf<typeof Message>

export const UserMessage = Message.extend({
    role: z.literal(USER),
})
export type UserMessage = z.TypeOf<typeof UserMessage>

export const AssistantMessage = Message.extend({
    role: z.literal(ASSISTANT),
})
export type AssistantMessage = z.TypeOf<typeof AssistantMessage>

export type MessagePair = {
    user: UserMessage
    assistant: AssistantMessage
}

export function constructUserMessage(content: string): UserMessage {
    return { content, role: USER }
}

export function constructAssistantMessage(content: string): AssistantMessage {
    return { content, role: ASSISTANT }
}
