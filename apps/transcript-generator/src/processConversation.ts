// Path: apps/transcript-generator/src/processConversation.ts

import { ConversationMemento } from '@memento-ai/types'

export interface ProcessedMessage {
    role: string
    content: string
    timestamp: Date
}

export interface ProcessedConversation {
    messages: ProcessedMessage[]
    startTime: Date
    endTime: Date
}

export function processConversation(mementos: ConversationMemento[]): ProcessedConversation {
    const messages: ProcessedMessage[] = mementos.map((memento) => ({
        role: memento.role || 'unknown',
        content: memento.content,
        timestamp: new Date(memento.created_at),
    }))

    const startTime = messages.length > 0 ? messages[0].timestamp : new Date()
    const endTime = messages.length > 0 ? messages[messages.length - 1].timestamp : new Date()

    return {
        messages,
        startTime,
        endTime,
    }
}
