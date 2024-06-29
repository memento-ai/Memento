# @memento-ai/agent

## Description
The `@memento-ai/agent` package provides an abstract `Agent` class that represents a conversational agent or a specialized tool. Agents can be used in place of a `ConversationInterface` in a conversation, and can be layered on top of or wrapped around another agent. This package is designed to be flexible, allowing for the creation of both simple tools and more complex agents with advanced functionality.

## Key Features
- Provides an abstract `Agent` base class with `forward` and `send` methods for sending messages via a `ConversationInterface`.
- Requires subclasses to implement a `generatePrompt` method to provide an agent-specific prompt.
- The `send` method constructs a `UserMessage` from the provided content and sends it along with the generated prompt to the `forward` method.
- The `forward` method delegates the message sending to the underlying `ConversationInterface`.
- Supports creation of both simple tools and complex agents with database connections and multiple functions.

## Usage and Examples

### Creating an Agent Subclass
To create a custom agent, extend the `Agent` class and implement the `generatePrompt` method:

```typescript
import { Agent, AgentArgs } from '@memento-ai/agent';

class MyAgent extends Agent {
  constructor(args: AgentArgs) {
    super(args);
  }

  async generatePrompt(): Promise<string> {
    return 'This is the prompt for MyAgent.';
  }
}
```

### Using an Agent
To use an agent, create an instance with the required `AgentArgs`:

```typescript
import { ConversationInterface } from '@memento-ai/conversation';

// Assume myConversationInterface is an instance of ConversationInterface
const myConversationInterface: ConversationInterface = /* ... */;

const myAgent = new MyAgent({
  conversation: myConversationInterface,
});

const response = await myAgent.send({ content: 'Hello, agent!' });
console.log(response);
```

### Using the `forward` Method
For more complex scenarios where you need to send multiple messages or a custom prompt:

```typescript
import { constructUserMessage } from '@memento-ai/types';

const customPrompt = 'This is a custom prompt for a specific task.';
const messages = [
  constructUserMessage('First message'),
  constructUserMessage('Second message'),
];

const response = await myAgent.forward({ prompt: customPrompt, messages });
console.log(response);
```

Note that the `send` method is designed for simple use cases with a single message, while `forward` provides more flexibility for complex interactions.
