# @memento-ai/postgres-db

## Description
The `@memento-ai/postgres-db` package provides utilities for interacting with a PostgreSQL database used by the Memento AI system. It includes functions for creating and managing the database schema, inserting and retrieving data, executing SQL queries, handling conversation history and summaries, and cleaning up orphaned user messages after application crashes.

## Key Features
- Create, drop, and manage PostgreSQL databases for Memento
- Define and manage the database schema, including tables for storing text content, embeddings, and metadata
- Insert and retrieve text content, embeddings, and associated metadata
- Execute raw SQL queries and stored procedures
- Retrieve conversation history and summaries
- Clean up orphaned user messages after application crashes
- Retrieve the last user and assistant messages
- Support for readonly database connections
- List existing databases
- Check if a specific database exists
- Wipe and recreate databases
- Create and manage database indexes

## Usage and Examples
### Creating and Managing Databases
```typescript
import { createNewEmptyDatabase, createMementoDb, dropDatabase, wipeDatabase, listDatabases, databaseExists } from '@memento-ai/postgres-db';

// Create a new empty database
await createNewEmptyDatabase('my_database');

// Create a new Memento database with the required schema
await createMementoDb('my_memento_database');

// Drop a database
await dropDatabase('my_database');

// Wipe and recreate a database
await wipeDatabase('my_memento_database');

// List all databases
const databases = await listDatabases();
console.log(databases);

// Check if a database exists
const exists = await databaseExists('my_database');
console.log(exists);
```

### Connecting to Databases
```typescript
import { connectDatabase, connectReadonlyDatabase } from '@memento-ai/postgres-db';

// Connect to a database
const pool = await connectDatabase('my_memento_database');

// Connect to a database with readonly access
const readonlyPool = await connectReadonlyDatabase('my_memento_database');
```

### Inserting and Retrieving Data
```typescript
import { addMemento, getConversation } from '@memento-ai/postgres-db';
import { CONV, ConversationMetaArgs } from '@memento-ai/types';
import { nanoid } from 'nanoid';

// Add a new conversation message
const metaId = nanoid();
const metaArgs: ConversationMetaArgs = {
    kind: CONV,
    role: 'user',
    source: 'conversation',
    priority: 0,
};
await addMemento({ pool, metaId, content: 'Hello, how are you?', metaArgs });

// Retrieve the conversation history
const conversation = await getConversation(pool, config);
console.log(conversation);
```

### Executing Raw SQL Queries
```typescript
import { executeFileQuery, delete_unreferenced_mems } from '@memento-ai/postgres-db';

// Execute a raw SQL query from a file
await executeFileQuery(conn, 'delete_unreferenced_mems.sql');

// Delete unreferenced mems
await delete_unreferenced_mems(conn);
```

### Cleaning Up Orphaned User Messages
```typescript
import { cleanUpLastUserMem } from '@memento-ai/postgres-db';

// Clean up the last user message if the application crashed before responding
await cleanUpLastUserMem(pool);
```

### Retrieving the Last User and Assistant Messages
```typescript
import { get_last_user_message, get_last_assistant_message } from '@memento-ai/postgres-db';

// Retrieve the last user message
const lastUserMessage = await get_last_user_message(pool);
console.log(lastUserMessage);

// Retrieve the last assistant message
const lastAssistantMessage = await get_last_assistant_message(conn);
console.log(lastAssistantMessage);
```

### Database Schema Management
```typescript
import { getDatabaseSchema } from '@memento-ai/postgres-db';

// Get the current database schema as a string
const schema = getDatabaseSchema();
console.log(schema);
```

This package provides a comprehensive set of tools for managing and interacting with the PostgreSQL database used in the Memento AI system, allowing for efficient storage and retrieval of conversation data, embeddings, and metadata.
