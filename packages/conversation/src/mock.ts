// Path: packages/conversation/src/mock.ts
import type { Message } from "@memento-ai/types";
import type { ConversationInterface, SendMessageArgs } from "./conversation";
import { type ConversationOptions } from './factory';

export class MockConversation implements ConversationInterface {

    constructor(_: ConversationOptions) {}

    async sendMessage(args: SendMessageArgs): Promise<Message> {
        // This "mock" is maybe more of a "dummy" than a mock,
        // as as it provides very miminal ability for a test to manipulate its behavior.
        // For now it just echoes back the last message in the conversation history.
        return args.messages[args.messages.length - 1];
    }
}
