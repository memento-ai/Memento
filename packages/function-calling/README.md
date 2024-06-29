# @memento-ai/function-calling
## Description
The `@memento-ai/function-calling` package provides a framework for defining and invoking functions within the Memento application. It allows for the registration and execution of functions, as well as the extraction and validation of function calls from content.

## Key Features
- Register custom functions with input/output schemas and function implementations
- Invoke registered functions with provided input and context
- Extract function call requests from content using a special code block syntax
- Validate extracted function calls against registered function schemas
- Execute multiple function calls in sequence, handling both synchronous and asynchronous functions
- Handle function errors and results
- Support for various types of functions including database queries, file operations, and system utilities

## Usage and Examples

### Registering Functions
To register a new function, import the `registerFunction` function from the `functionRegistry` module and provide a `FunctionConfig` object:

```typescript
import { registerFunction, type FunctionRegistry } from '@memento-ai/function-calling/src/functionRegistry';
import { z } from 'zod';

const registry: FunctionRegistry = {};

const getCurrentTimeConfig = {
  name: 'getCurrentTime',
  inputSchema: z.object({}),
  outputSchema: z.promise(z.string()),
  fnSchema: z.function().args(z.object({})).returns(z.promise(z.string())),
  fn: async () => new Date().toISOString(),
};

registerFunction(registry, getCurrentTimeConfig);
```

### Invoking Functions
You can invoke registered functions using the `invokeOneFunction` function from the `functionCalling` module:

```typescript
import { invokeOneFunction, type FunctionCall, type FunctionCallResult } from '@memento-ai/function-calling/src/functionCalling';
import { registry } from '@memento-ai/function-calling/src/functions';

const call: FunctionCall = {
  name: 'getCurrentTime',
  input: {},
};

const context = { readonlyPool: db.readonlyPool };
const result: FunctionCallResult = await invokeOneFunction({ registry, call, context });
```

### Extracting Function Calls
The `functionCalling` module provides a way to extract function calls from content, using the `extractFunctionCalls` function:

```typescript
import { extractFunctionCalls, type FunctionCallRequest } from '@memento-ai/function-calling/src/functionCalling';

const content = `
\`\`\`function
{
  "name": "getCurrentTime",
  "input": {}
}
\`\`\``;

const functionCalls: FunctionCallRequest[] = Array.from(extractFunctionCalls(content));
```

This will extract the function call request from the provided content and return an array of `FunctionCallRequest` objects.

### Executing Multiple Function Calls
You can execute multiple function calls in sequence using the `invokeMultFunctions` function:

```typescript
import { invokeMultFunctions, type FunctionCallRequest } from '@memento-ai/function-calling/src/functionCalling';
import { registry } from '@memento-ai/function-calling/src/functions';

const functionCalls: FunctionCallRequest[] = [
  { name: 'getCurrentTime', input: {} },
  { name: 'gitListFiles', input: {} },
];

const context = { readonlyPool: db.readonlyPool };
const results: FunctionCallResult[] = await invokeMultFunctions({ registry, calls: functionCalls, context });
```

### Invoking Synchronous and Asynchronous Functions
The `invokeSyncAndAsyncFunctions` function allows executing both synchronous and asynchronous function calls extracted from an assistant's message:

```typescript
import { invokeSyncAndAsyncFunctions, type InvokeFunctionsArgs, type InvokeFunctionsResults } from '@memento-ai/function-calling/src/invokeSyncAndAsyncFunctions';

const invokeFunctionsArgs: InvokeFunctionsArgs = {
  assistantMessage, 
  context, 
  registry, 
  asyncResultsP: Promise.resolve([]), 
  cycleCount: 1
};

const { functionResultContent, newAsyncResultsP }: InvokeFunctionsResults = await invokeSyncAndAsyncFunctions(invokeFunctionsArgs);
```

This will execute the synchronous functions immediately, while asynchronous functions will be invoked and their results will be available in the next cycle via the `newAsyncResultsP` promise.

### Available Functions
The package includes several pre-defined functions:

- `addSynopsis`: Creates a synopsis memento from the input.
- `getCurrentTime`: Returns the current UTC time.
- `gitListFiles`: Returns a list of file paths tracked by git for the current repository.
- `queryMementoView`: Executes a SQL SELECT query on the memento view.
- `readSourceFile`: Reads the content of a source file and returns it as a single string.

These functions can be imported and used as part of the function registry.

### Error Handling
The package includes robust error handling for various scenarios, including invalid function calls, execution errors, and exceeding function call limits. Errors are returned as part of the function call results, allowing for graceful error handling and reporting.

For more detailed information on each function and its usage, refer to the source files in the `src/functions` directory.
