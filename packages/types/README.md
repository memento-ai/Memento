# @memento-ai/types

## Description
The `@memento-ai/types` package provides the core data types and schemas used throughout the Memento application. It defines the structure of the `Mem` object, which represents a single piece of content, as well as the various metadata types associated with each `Mem`. The package also includes enumerations for classifying different types of `Mem` objects and representing the roles of users and assistants in conversations.

## Key Features
- Defines the `Mem` object schema, which represents a single piece of content with its ID, content string, embedding vector, and token count.
- Provides metadata schemas for different types of `Mem` objects, including conversations, documents, fragments, summaries, and synopses.
- Includes enumerations for classifying `Mem` objects by their kind (e.g., conversation, document, fragment) and representing user and assistant roles.
- Offers utility functions for creating `Mem` objects and parsing various data types.

## Usage and Examples

The types and schemas defined in this package are used extensively throughout the Memento codebase to ensure consistency and type safety. Here are some examples of how they can be used:

```typescript
import { Mem, createMem } from '@memento-ai/types/memSchema';
import { ConversationMetaData } from '@memento-ai/types/metaSchema';
import { USER, ASSISTANT } from '@memento-ai/types/role';

// Create a new Mem
const mem = await createMem('Hello, world!');
console.log(mem.id, mem.content, mem.embed_vector, mem.tokens);

// Create a ConversationMetaData object
const conversationMeta: ConversationMetaData = {
    kind: 'conv',
    id: '123',
    memId: mem.id,
    role: USER,
    priority: 0,
};

// Use the USER and ASSISTANT roles
const message = { role: USER, content: 'Hello' };
```

The `@memento-ai/types` package provides a centralized location for defining and managing the core data structures used throughout the Memento application. By ensuring consistency and type safety, it helps maintain a cohesive and well-structured codebase.