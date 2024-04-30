# @memento-ai/agent

## Description

The `@memento-ai/agent` package provides an abstract `Agent` class that represents a conversational agent or a specialized tool. Agents can be used in place of a `ConversationInterface` in a Conversation, and can be layered on top of or wrapped around another Agent.

## Key Features

- The `Agent` class implements the `ConversationInterface`, which means it can be used in place of a `ConversationInterface` in a Conversation.
- An `Agent` can have a database connection (`MementoDb`), a registry of callable functions (`FunctionRegistry`), and a prompt.
- The primary method is `sendMessage`, which has the same signature as `ConversationInterface.sendMessage`.
- The `send` method is a convenience method for simple tools with a fixed prompt and a single message (no conversation history).

## Usage and Examples

### Creating an Agent Subclass

To use the `Agent` class, you can create a subclass that implements the `sendMessage` method. Here's an example:

```typescript
import { Agent, AgentArgs, SendArgs } from '@memento-ai/agent';
import { ConversationInterface, SendMessageArgs } from '@memento-ai/conversation';
import { FunctionRegistry } from '@memento-ai/function-calling';
import { MementoDb } from '@memento-ai/memento-db';
import { Message, USER } from '@memento-ai/types';

class MyAgent extends Agent {
  constructor(args: AgentArgs) {
    super(args);
  }

  async sendMessage({ prompt, messages }: SendMessageArgs): Promise<Message> {
    // Implement your agent's logic here
    const response = await this.conversation.sendMessage({ prompt, messages });
    return response;
  }

  async send({ content }: SendArgs): Promise<Message> {
    const role = USER;
    return this.sendMessage({ prompt: this.Prompt, messages: [{ role, content }] });
  }
}
```

In this example, we create a subclass of `Agent` called `MyAgent` that implements the `sendMessage` method. The `sendMessage` method is the primary method of an `Agent` and has the same signature as `ConversationInterface.sendMessage`. This means that an `Agent` can be used in place of a `ConversationInterface` in a Conversation, and that an `Agent` can be layered on top of or wrapped around another `Agent`.

The `send` method is a convenience method that can be used for simple tools with a fixed prompt and a single message (no conversation history). It calls the `sendMessage` method with the agent's prompt and a single message with the provided content.

### Using an Agent

```typescript
// Usage
const myAgent = new MyAgent({
  conversation: myConversationInterface,
  db: myMementoDb,
  prompt: 'Hello, how can I assist you today?',
  registry: myFunctionRegistry,
});

const response = await myAgent.send({ content: 'What is the weather like today?' });
console.log(response);
```

In this example, we create an instance of `MyAgent` and use its `send` method to send a message to the agent. The `send` method returns a `Message` object, which can be logged or further processed.
