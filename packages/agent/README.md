# @memento-ai/agent

## Description
The `@memento-ai/agent` package provides an abstract `Agent` class that represents a conversational agent or a specialized tool. Agents can be used in place of a `ConversationInterface` in a conversation, and can be layered on top of or wrapped around another agent.

## Key Features
- Provides an abstract `Agent` base class with `forward` and `send` methods for sending messages via a `ConversationInterface`.
- Requires subclasses to implement a `generatePrompt` method to provide an agent-specific prompt.
- Offers a `FunctionCallingAgent` subclass that adds support for a `FunctionRegistry` to allow agents to invoke functions.
- Agents can optionally have a database connection via a `MementoDb` instance.
- The `send` method constructs a `UserMessage` from the provided content and sends it along with the generated prompt to the `forward` method.
- The `forward` method delegates the message sending to the underlying `ConversationInterface`.

## Usage and Examples

### Creating an Agent Subclass
To create a custom agent, extend the `Agent` class and implement the `generatePrompt` method:

```typescript
import { Agent, AgentArgs, SendArgs } from '@memento-ai/agent';

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
const myAgent = new MyAgent({
  conversation: myConversationInterface,
  db: myMementoDb,
});

const response = await myAgent.send({ content: 'Hello, agent!' });
console.log(response);
```

### Creating a Function Calling Agent
To create an agent that can invoke functions, extend the `FunctionCallingAgent` class:

```typescript
import { FunctionCallingAgent, FunctionCallingAgentArgs } from '@memento-ai/agent';

class MyFunctionCallingAgent extends FunctionCallingAgent {
  constructor(args: FunctionCallingAgentArgs) {
    super(args);
  }

  async generatePrompt(): Promise<string> {
    return 'This is the prompt for MyFunctionCallingAgent.';
  }
}
```

Then create an instance with the required `FunctionCallingAgentArgs`, including a `FunctionRegistry`:

```typescript
const myFunctionCallingAgent = new MyFunctionCallingAgent({
  conversation: myConversationInterface, 
  db: myMementoDb,
  registry: myFunctionRegistry,
});
```

The `FunctionCallingAgent` class also provides a `lastUserMessage` property and a `checkForFunctionResults` method to handle function results from the user's input.
