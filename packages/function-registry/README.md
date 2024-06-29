# Function Registry

## Description
The Function Registry package provides a framework for defining, registering, and managing functions within the Memento AI system. It allows for the creation of a centralized registry of functions that can be dynamically invoked by the assistant/MementoAgent.

## Key Features
- Define and register functions with input and output schemas
- Generate function descriptions for use in prompts
- Execute registered functions with type safety
- Support for asynchronous functions
- Integration with the Memento database and utility functions
- Handlebars templates for generating function descriptions and prompts

## Usage and Examples

### Defining a Function

To define a new function, create a configuration object that includes the function name, input schema, output schema, and the function implementation:

```typescript
import { z } from 'zod'
import { FunctionConfig, baseInputSchema } from '../functionRegistry'

const inputSchema = baseInputSchema.extend({
    query: z.string().describe('The SQL query to execute.'),
})

const outputSchema = z.promise(z.array(z.unknown()))

const fnSchema = z
    .function()
    .args(inputSchema)
    .returns(outputSchema)
    .describe('Execute a SQL SELECT query on the memento view.')

async function queryMementoView(input: z.infer<typeof inputSchema>): Promise<z.infer<typeof outputSchema>> {
    // Function implementation
}

const config: FunctionConfig<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
    name: 'queryMementoView',
    inputSchema,
    outputSchema,
    fnSchema,
    fn: queryMementoView,
}

export default config
```

### Registering Functions

To register functions in the registry, import the function configurations and use the `registerFunction` utility:

```typescript
import { registerFunction, FunctionRegistry } from './functionRegistry'
import queryMementoView from './queryMementoView'
import getCurrentTime from './getCurrentTime'

export const registry: FunctionRegistry = {}

registerFunction(registry, queryMementoView)
registerFunction(registry, getCurrentTime)
```

### Generating Function Descriptions

You can generate descriptions for individual functions or the entire registry:

```typescript
import { generateFunctionDescription, getRegistryDescription } from './functionRegistry'
import { registry } from './registry'

const singleFunctionDescription = generateFunctionDescription(registry['queryMementoView'])
console.log(singleFunctionDescription)

const allFunctionsDescription = getRegistryDescription(registry)
console.log(allFunctionsDescription)
```

### Executing Registered Functions

To execute a registered function:

```typescript
import { registry } from './registry'

const result = await registry['queryMementoView'].fn({
    query: 'SELECT * FROM memento LIMIT 5',
    context: { readonlyPool: db.readonlyPool },
})
console.log(result)
```

### Available Functions

The Function Registry package includes several pre-defined functions:

1. `addSynopsis`: Creates a synopsis memento from the input.
2. `getCurrentTime`: Returns the current UTC time.
3. `gitListFiles`: Returns a list of file paths tracked by git for the current repository.
4. `queryMementoView`: Executes a SQL SELECT query on the memento view.
5. `readSourceFile`: Reads the content of a source file and returns it as a single string.
6. `writeSourceFile`: Writes content to a source file and returns a status message.

Each of these functions can be accessed and executed through the registry as demonstrated in the examples above.

### Using Handlebars Templates

The Function Registry package includes Handlebars templates for generating function descriptions and prompts:

```typescript
import { function_description_template, function_registry_template, function_prompt_template } from './functionRegistryTemplate'

// Generate a description for a single function
const functionDescription = function_description_template({
    name: 'exampleFunction',
    purpose: 'This function does something useful',
    input: 'Some input parameters',
    output: 'The expected output'
})

// Generate a description for the entire function registry
const registryDescription = function_registry_template({
    function: [
        { name: 'func1', purpose: 'Purpose 1', input: 'Input 1', output: 'Output 1' },
        { name: 'func2', purpose: 'Purpose 2', input: 'Input 2', output: 'Output 2' }
    ]
})

// Generate a prompt for function calling
const functionPrompt = function_prompt_template({
    functions: [
        { name: 'func1', purpose: 'Purpose 1', input: 'Input 1', output: 'Output 1' },
        { name: 'func2', purpose: 'Purpose 2', input: 'Input 2', output: 'Output 2' }
    ]
})
```

These templates provide a standardized way to generate function descriptions and prompts, which can be used in the Memento AI system for consistent function documentation and invocation.
