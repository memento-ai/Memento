# @memento-ai/function-calling
## Description
The `@memento-ai/function-calling` package provides a framework for defining, extracting, and invoking functions within the Memento AI system. It allows for seamless integration of function calls into conversations, handling both synchronous and asynchronous functions, and managing function execution within the context of an AI agent.

## Key Features
- Extract function call requests from content using a special code block syntax
- Validate extracted function calls against registered function schemas
- Invoke registered functions with provided input and context
- Execute multiple function calls in sequence, handling both synchronous and asynchronous functions
- Manage function errors and results
- Support for various types of functions including database queries, file operations, and system utilities
- Recursive function calling with cycle count limit
- Integration with Memento agents for seamless function execution within conversations
- Robust error handling for various scenarios, including invalid function calls, execution errors, and exceeding function call limits

## Usage and Examples

### Extracting Function Calls
The `extractFunctionCalls` function allows you to extract function calls from content:

```typescript
import { extractFunctionCalls } from '@memento-ai/function-calling';

const content = `
\`\`\`function
{
  "name": "getCurrentTime",
  "input": {}
}
\`\`\``;

const functionCalls = Array.from(extractFunctionCalls(content));
```

### Invoking Functions
You can invoke registered functions using the `invokeOneFunction` or `invokeMultFunctions` functions:

```typescript
import { invokeOneFunction, invokeMultFunctions } from '@memento-ai/function-calling';
import { registry } from '@memento-ai/function-registry';

// Invoke a single function
const call = { name: 'getCurrentTime', input: {} };
const context = {};
const result = await invokeOneFunction({ registry, call, context });

// Invoke multiple functions
const calls = [
  { name: 'getCurrentTime', input: {} },
  { name: 'gitListFiles', input: {} }
];
const results = await invokeMultFunctions({ registry, calls, context });
```

### Function Calling Agent
The `FunctionCallingAgent` class provides a base for creating agents that can handle function calls:

```typescript
import { FunctionCallingAgent } from '@memento-ai/function-calling';

class MyAgent extends FunctionCallingAgent {
  // Implement agent-specific logic
}

const agent = new MyAgent({
  db: mementoDb,
  registry: functionRegistry,
  // ... other agent configuration
});
```

### Function Handler
The `FunctionHandler` class manages the execution of functions within a conversation:

```typescript
import { FunctionHandler } from '@memento-ai/function-calling';

const handler = new FunctionHandler({ agent: myAgent });

const userMessage = { content: 'What time is it?', role: 'user' };
const priorMessages = [];
const assistantMessage = await handler.handle(userMessage, priorMessages);
```

### Invoking Synchronous and Asynchronous Functions
The `invokeSyncAndAsyncFunctions` function allows executing both synchronous and asynchronous function calls:

```typescript
import { invokeSyncAndAsyncFunctions } from '@memento-ai/function-calling';

const args = {
  assistantMessage,
  context,
  registry,
  asyncResultsP: Promise.resolve([]),
  cycleCount: 1
};

const { functionResultContent, newAsyncResultsP } = await invokeSyncAndAsyncFunctions(args);
```

### Error Handling
The package includes robust error handling for various scenarios, including invalid function calls, execution errors, and exceeding function call limits. Errors are returned as part of the function call results, allowing for graceful error handling and reporting.

For more detailed information on each function and its usage, refer to the source files in the `src` directory.
