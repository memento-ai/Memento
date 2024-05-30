// Path: packages/agent/src/agent.ts

import type { ConversationInterface, SendMessageArgs } from "@memento-ai/conversation";
import { FUNCTION_RESULT_HEADER, type FunctionRegistry } from "@memento-ai/function-calling";
import type { MementoDb } from "@memento-ai/memento-db";
import { constructUserMessage, UserMessage, AssistantMessage, USER } from "@memento-ai/types";
import type { Message } from "@memento-ai/types";

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
    conversation: ConversationInterface;
    db?: MementoDb;
}

export type FunctionCallingAgentArgs = AgentArgs & {
    registry: FunctionRegistry;
}

export interface SendArgs {
    content: string;
}

export abstract class Agent  {
    private conversation: ConversationInterface;
    protected db?: MementoDb;

    constructor({conversation, db}: AgentArgs) {
        this.conversation = conversation;
        this.db = db;
        Object.defineProperty(this, 'send', {
            value: this.send,
            writable: false,
            configurable: false
        });
    }

    // This method forwards the message to the conversation interface.
    // We could have used the exact same method name as in ConversationInterface,
    // and even declared that Agent implements ConversationInterface,
    // but that's not necessary and could lead to confusion.
    // Instead, we just delegate to ConversationInterface through this method.
    // All subclasses of Agent will have to call this method either directly
    // or indirectly via the send method.
    async forward({ prompt, messages }: SendMessageArgs): Promise<AssistantMessage>
    {
        return this.conversation.sendMessage({ prompt, messages }) ;
    }

    // Every agent will need a prompt that is specific to the agent
    // It is useful to have a comment method for this purpose.
    abstract generatePrompt(): Promise<string>;

    // This is a convenience method what will be used for simple tools with a fixed prompt and a single message (no coversation history)
    // But note that this method cannot be overridden by subclasses, as it becomes difficult to reason about behavior
    // if both send and sendMessage can be overridden.
    public async send({content}: SendArgs): Promise<AssistantMessage> {
        const prompt = await this.generatePrompt();
        const message = constructUserMessage(content);
        return this.forward({prompt, messages: [message]})
    }

    get DB(): MementoDb
    {
        if (!this.db)
        {
            throw new Error("Agent: Database connection is not set");
        }
        return this.db;
    }

}

export abstract class FunctionCallingAgent extends Agent {
    protected registry: FunctionRegistry;
    lastUserMessage: UserMessage;

    constructor(args: FunctionCallingAgentArgs) {
        super(args);
        this.registry = args.registry;
        this.lastUserMessage = { content: "", role: USER };
    }

    checkForFunctionResults(userMessage: UserMessage): void {
        if (!userMessage.content.startsWith(FUNCTION_RESULT_HEADER)) {
            this.lastUserMessage = userMessage;
        }
    }

    get Registry(): FunctionRegistry
    {
        return this.registry;
    }
}
