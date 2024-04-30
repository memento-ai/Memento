// Path: packages/agent/src/agent.ts
import type { ConversationInterface, SendMessageArgs } from "@memento-ai/conversation";
import type { FunctionRegistry } from "@memento-ai/function-calling";
import type { MementoDb } from "@memento-ai/memento-db";
import { USER, type Message } from "@memento-ai/types";

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

// The core method of an Agent is `sendMessage` with a signature that implements ConversationInterface.
// This means that an Agent can be used in place of a ConversationInterface in a Conversation.
// and that an Agent can be layered on top of (or wrapping) another Agent.

export interface AgentArgs {
    conversation: ConversationInterface;
    db?: MementoDb;
    prompt?: string;
    registry?: FunctionRegistry;
}

export interface SendArgs {
    content: string;
}

export abstract class Agent implements ConversationInterface {
    protected conversation: ConversationInterface;
    protected db?: MementoDb;
    protected prompt?: string;
    protected registry?: FunctionRegistry;

    constructor({conversation, db, prompt, registry}: AgentArgs) {
        this.conversation = conversation;
        this.db = db;
        this.prompt = prompt;
        this.registry = registry;
    }

    // This is primary method and has the same signature as ConversationInterface
    abstract sendMessage({ prompt, messages }: SendMessageArgs): Promise<Message>;

    // This is a convenience method what will be used for simple tools with a fixed prompt and a single message (no coversation history)
    // But it can be overridden in a subclass to provide more complex behavior, and in fact,
    // this is the interface that was formerly newMessageToAssistant in MementoAgent.
    async send({content}: SendArgs): Promise<Message> {
        const role = USER;
        return this.sendMessage({prompt: this.Prompt, messages: [{ role, content }]})
    }

    get DB(): MementoDb
    {
        if (!this.db)
        {
            throw new Error("Agent: Database connection is not set");
        }
        return this.db;
    }

    get Registry(): FunctionRegistry
    {
        if (!this.registry)
        {
            throw new Error("Agent: Function registry is not set");
        }
        return this.registry;
    }

    get Prompt(): string
    {
        if (!this.prompt)
        {
            throw new Error("Agent: Prompt is not defined");
        }
        return this.prompt;
    }
}
