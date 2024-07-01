# @memento-ai/memento-db
## Description
The `@memento-ai/memento-db` package provides a TypeScript interface for interacting with a PostgreSQL database to store and retrieve "mementos" - pieces of information that are part of a conversational history. It allows for adding different types of mementos such as conversation messages, document fragments, documents with summaries, conversation exchanges (user-assistant message pairs), resolutions, synopses, and linking conversation exchanges to synopses. Additionally, it provides functionality for retrieving the conversation history, resolutions, synopses, and the last user and assistant messages.

## Key Features
- Add conversation mementos (user and assistant messages)
- Add fragment mementos (excerpts from documents)
- Add documents and their summaries
- Add conversation exchange mementos (user-assistant message pairs)
- Add resolution mementos
- Add synopsis mementos
- Link conversation exchange mementos to synopsis mementos
- Retrieve the conversation history
- Retrieve resolution mementos
- Retrieve synopses (short summaries) from the database
- Get the last user and assistant messages in a conversation
- Generate and retrieve text embeddings for semantic search

## Usage and Examples
The main entry point is the `MementoDb` class, which provides methods for interacting with the database:

```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { USER, ASSISTANT } from '@memento-ai/types';

// Create a new MementoDb instance
const db = await MementoDb.connect('my-memento-db');

// Add a conversation memento
const convId = await db.addConversationMem({
  content: 'This is a test conversation memento',
  role: USER,
  priority: 1
});

// Add a document and summary memento
const { docid, summaryid } = await db.addDocAndSummary({
  content: 'This is a test document',
  summary: 'This document summarizes some information',
  source: 'test-source'
});

// Add a conversation exchange memento
const xchgId = await db.addConvExchangeMementos({
  userContent: 'This is a user message',
  asstContent: 'This is an assistant response'
});

// Link a conversation exchange to a synopsis
await db.linkExchangeSynopsis({
  xchg_id: xchgId,
  synopsis_id: 'synopsis-123'
});

// Add a resolution memento
const resId = await db.addResolutionMem({
  content: 'This is a resolution memento'
});

// Add a synopsis memento
const synId = await db.addSynopsisMem({
  content: 'This is a synopsis memento'
});

// Get the conversation history
const config = loadDefaultConfig(); // Assuming you have a config loader
const conversation = await db.getConversation(config);

// Get resolution mementos
const resolutions = await db.getResolutions();

// Get synopses
const synopses = await db.getSynopses(1000); // Get synopses with a token limit of 1000

// Get the last user and assistant messages
const lastUserMessage = await db.get_last_user_message();
const lastAssistantMessage = await db.get_last_assistant_message();

// Close the database connection when done
await db.close();
```

This package is designed to work seamlessly with other components of the Memento AI system, providing a robust storage and retrieval mechanism for maintaining conversational context and related information.
