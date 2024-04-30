# @memento-ai/postgres-db

The `@memento-ai/postgres-db` package provides utilities for interacting with a PostgreSQL database used by the Memento AI system. It includes functions for creating and managing the database schema, inserting and retrieving data, and executing SQL queries.

## Key Features

- Create and drop PostgreSQL databases for Memento
- Define and manage the database schema, including tables for storing text content, embeddings, and metadata
- Insert and retrieve text content, embeddings, and associated metadata
- Execute raw SQL queries and stored procedures
- Retrieve conversation history and summaries
- Clean up orphaned user messages after application crashes

## Usage and Examples

### Creating and Managing Databases

```typescript
import { createNewEmptyDatabase, createMementoDb, dropDatabase } from '@memento-ai/postgres-db';

// Create a new empty database
await createNewEmptyDatabase('my_database');

// Create a new Memento database with the required schema
await createMementoDb('my_memento_database');

// Drop a database
await dropDatabase('my_database');
```

### Inserting and Retrieving Data

```typescript
import { addMem, getConversation } from '@memento-ai/postgres-db';
import { CONV, ConversationMetaArgs } from '@memento-ai/types';

// Add a new conversation message
const metaId = nanoid();
const metaArgs: ConversationMetaArgs = {
    kind: CONV,
    role: 'user',
    source: 'conversation',
    priority: 0,
};
await addMem({ pool, metaId, content: 'Hello, how are you?', metaArgs });

// Retrieve the conversation history
const conversation = await getConversation(pool);
console.log(conversation);
```

### Executing Raw SQL Queries

```typescript
import { executeFileQuery, get_csum_mementos } from '@memento-ai/postgres-db';

// Execute a raw SQL query from a file
await executeFileQuery(conn, 'delete_unreferenced_mems.sql');

// Execute a raw SQL query with a typed result
const convSummaries = await get_csum_mementos(conn);
console.log(convSummaries);
```

### Cleaning Up Orphaned User Messages

```typescript
import { cleanUpLastUserMem } from '@memento-ai/postgres-db';

// Clean up the last user message if the application crashed before responding
await cleanUpLastUserMem(pool);
```