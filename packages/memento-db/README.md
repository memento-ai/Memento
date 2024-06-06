# @memento-ai/memento-db
## Description
The `@memento-ai/memento-db` package provides a TypeScript interface for interacting with a PostgreSQL database to store and retrieve "mementos" - pieces of information that are part of a conversational history. It includes functionality for adding different types of mementos (conversations, fragments, documents, and summaries), searching for similar mementos, and retrieving pinned conversation summaries.

## Key Features
- Add conversation mementos (user and assistant messages)
- Add fragment mementos (excerpts from documents)
- Add documents and their summaries
- Add conversation summaries (pinned or unpinned)
- Add conversation exchange mementos (user-assistant message pairs)
- Link conversation exchange mementos to synopsis mementos
- Retrieve the conversation history
- Search for mementos similar to a given user message using semantic similarity
- Retrieve pinned conversation summary mementos
- Retrieve synopses (short summaries) from the database
- Get the last user and assistant messages in a conversation

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

// Get the last user and assistant messages
const lastUserMessage = await db.get_last_user_message();
const lastAssistantMessage = await db.get_last_assistant_message();
```

### Key Methods
- `addConversationMem`: Add a conversation memento to the database.
- `addFragmentMem`: Add a fragment memento to the database.
- `addDocAndSummary`: Add a document and its summary to the database.
- `addConvSummaryMem`: Add a conversation summary memento to the database.
- `addConvExchangeMementos`: Add a conversation exchange memento (user-assistant message pair).
- `linkExchangeSynopsis`: Link a conversation exchange memento to a synopsis memento.
- `getConversation`: Retrieve the conversation history as an array of messages.
- `getSynopses`: Retrieve a list of synopses (short summaries) from the database.
- `get_last_user_message`: Get the last user message in the conversation.
- `get_last_assistant_message`: Get the last assistant message in the conversation.

The package also includes utility functions for computing cosine similarity between conversation summaries (`checkCsumSimilarity`) and a script for identifying and removing duplicate conversation summaries (`computeCsumSimilarities`).

See the `src` directory for the full implementation of the `MementoDb` class and its methods, as well as unit tests demonstrating the functionality.
