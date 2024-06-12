# @memento-ai/system

## Description
The `@memento-ai/system` package provides functionality for creating and managing the core components of the Memento AI system, including the database, agents, and conversation interfaces.

## Key Features
- Creates instances of the `MementoDb`, `MementoAgent`, `SynopsisAgent`, and `ResolutionAgent` classes based on the provided configuration.
- Provides factory functions to create a conversation interface using the specified provider and configuration.
- Allows for the creation of a complete Memento system with all the necessary components.
- Provides a utility function for creating a test system with optional inclusion of synopsis and resolution agents.

## Usage and Examples
To create a Memento system, use the `createMementoSystem` function:

```typescript
import { createMementoSystem } from '@memento-ai/system';

const config: Config = {
  // Provide the necessary configuration
};

const outStream: Writable = process.stdout; // Optional output stream

const system: MementoSystem = await createMementoSystem(config, outStream);
```

The `createMementoSystem` function returns an object containing the following properties:
- `db`: An instance of `MementoDb`.
- `mementoAgent`: An instance of `MementoAgent`.
- `synopsisAgent`: An instance of `SynopsisAgent` (optional, based on configuration).
- `resolutionAgent`: An instance of `ResolutionAgent` (optional, based on configuration).

To create a test system with optional inclusion of synopsis and resolution agents, use the `makeTestSystem` function:

```typescript
import { makeTestSystem } from '@memento-ai/system';

const args: MakeTestSystemArgs = {
  database: 'test_db',
  synopsis: true,
  resolution: false,
};

const testSystem: MementoSystem = await makeTestSystem(args);
```

The `makeTestSystem` function takes an object with the following properties:
- `database`: The name of the database to use for the test system.
- `synopsis`: A boolean indicating whether to include the synopsis agent (default: `false`).
- `resolution`: A boolean indicating whether to include the resolution agent (default: `false`).
