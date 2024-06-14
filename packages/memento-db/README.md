# @memento-ai/memento-db
## Description
The `@memento-ai/memento-db` package provides a TypeScript interface for interacting with a PostgreSQL database to store and retrieve "mementos" - pieces of information that are part of a conversational history. It includes functionality for adding different types of mementos (conversations, fragments, documents, summaries, resolutions, synopses, and conversation exchanges), searching for similar mementos, and retrieving conversation history.

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
- Add multiple mementos in a single transaction for a conversation exchange (user message, assistant message, and the exchange itself)

## Usage and Examples
The main entry point is the `MementoDb` class, which provides methods for interacting with the database:

```typescript
import { MementoDb } from '@memento-ai/memento-db';

// Create a new MementoDb instance
const db = await MementoDb.create('my-memento-db');

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
const conversation = await db.getConversation();

// Get resolution mementos
const resolutions = await db.getResolutions();

// Get the last user and assistant messages
const lastUserMessage = await db.get_last_user_message();
const lastAssistantMessage = await db.get_last_assistant_message();
```
