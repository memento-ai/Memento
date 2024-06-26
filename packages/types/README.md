# @memento-ai/types

## Description
The `@memento-ai/types` package provides the core data types, schemas, and utility functions used throughout the Memento application. It defines the structure of various objects such as `Mem`, `Memento`, and different types of metadata, as well as enumerations for classifying different types of `Mem` objects and representing the roles of users and assistants in conversations.

## Key Features
- Defines the `Mem` object schema, representing a single piece of content with its ID, content string, embedding vector, and token count.
- Provides metadata schemas for different types of `Mem` objects, including conversations, documents, fragments, summaries, synopses, resolutions, and conversation exchanges.
- Includes enumerations for classifying `Mem` objects by their kind (e.g., conversation, document, fragment) and representing user and assistant roles.
- Offers utility functions for creating `Mem` objects and constructing user and assistant messages.
- Defines the `Memento` schema, which combines a metadata record with the linked `Mem` content record.
- Provides argument schemas for creating different types of metadata records.
- Utilizes Zod for runtime type checking and validation.

## Usage and Examples

The types and schemas defined in this package are used extensively throughout the Memento codebase to ensure consistency and type safety. Here are some examples of how they can be used:

```typescript
import { Mem, createMem } from '@memento-ai/types/memSchema';
import { ConversationMetaData } from '@memento-ai/types/metaSchema';
import { USER, ASSISTANT } from '@memento-ai/types/role';
import { constructUserMessage, constructAssistantMessage } from '@memento-ai/types/message';
import { CONV, DOC, FRAG } from '@memento-ai/types/memKind';
import { Memento } from '@memento-ai/types/mementoSchema';

// Create a new Mem
const mem = await createMem('Hello, world!');
console.log(mem.id, mem.content, mem.embed_vector, mem.tokens);

// Create a ConversationMetaData object
const conversationMeta: ConversationMetaData = {
    kind: CONV,
    id: '123',
    memId: mem.id,
    role: USER,
    docid: '456',
    created_at: new Date(),
};

// Use the USER and ASSISTANT roles
const userMessage = constructUserMessage('Hello');
const assistantMessage = constructAssistantMessage('Hi there!');

// Create a Memento object
const memento: Memento = {
    kind: DOC,
    id: '789',
    memId: mem.id,
    created_at: new Date(),
    summaryid: '101',
    source: 'example.txt',
    content: 'This is an example document content.',
    tokens: 7,
};

// Use MemKind values
console.log(CONV, DOC, FRAG);
```

The `@memento-ai/types` package provides a centralized location for defining and managing the core data structures used throughout the Memento application. By ensuring consistency and type safety, it helps maintain a cohesive and well-structured codebase.
