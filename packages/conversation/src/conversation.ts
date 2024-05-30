// Path: packages/conversation/src/conversation.ts

import { AssistantMessage, type Message } from '@memento-ai/types';

// We only declare the interface for sending a message here.
// See factory.ts for how we create instances of Conversations that implement this interface
// Note that we include the prompt argument in the sendMessage call because we will
// dynamically change the prompt with every new message.

export interface SendMessageArgs {
    // The system prompt
    prompt: string;

    // All of the selected conversation history (user, assistant pairs)
    // and the user's most recent message for which the assistant is to respond
    messages: Message[];
}

export interface ConversationInterface {
    sendMessage(args: SendMessageArgs): Promise<AssistantMessage>;
}
