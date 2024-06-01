# @memento-ai/agent

## Description
The `@memento-ai/agent` package provides an abstract `Agent` class that represents a conversational agent or a specialized tool. Agents can be used in place of a `ConversationInterface` in a Conversation, and can be layered on top of or wrapped around another Agent.

## Key Features
- The `Agent` class provides a `forward` method that delegates to the `sendMessage` method of the underlying `ConversationInterface`.
- The `Agent` class provides an abstract `generatePrompt` method that subclasses must implement to provide a prompt specific to the agent.
- The `Agent` class provides a `send` method as a convenience for simple tools with a fixed prompt and a single message (no conversation history).
- The `FunctionCallingAgent` subclass adds support for a `FunctionRegistry` to allow agents to invoke functions.

## Usage and Examples

### Creating an Agent Subclass
To create a custom agent, extend the `Agent` class and implement the `generatePrompt` method:

```typescript
import { Agent, AgentArgs, SendArgs } from '@memento-ai/agent';
import { AssistantMessage } from '@memento-ai/types';

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
