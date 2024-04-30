# @memento-ai/memento-db

The `@memento-ai/memento-db` package provides a TypeScript interface for interacting with a PostgreSQL database to store and retrieve "mementos" - pieces of information that are part of a conversational history. It includes functionality for adding different types of mementos (conversations, fragments, documents, and summaries), searching for similar mementos, and retrieving pinned conversation summaries.

## Key Features

- Add conversation mementos (user and assistant messages)
- Add fragment mementos (excerpts from documents)
- Add documents and their summaries
- Add conversation summaries (pinned or unpinned)
- Retrieve the conversation history
- Search for mementos similar to a given user message using semantic similarity
- Retrieve pinned conversation summary mementos
- Retrieve synopses (short summaries) from the database

## Usage

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
const { docId, summaryId } = await db.addDocAndSummary({
  content: 'This is a test document',
  summary: 'This document summarizes some information',
  source: 'test-source'
});

// Search for similar mementos
const similarMementos = await db.searchMemsBySimilarity(
  'This is a user message to search for similar mementos',
  2000
);

// Retrieve pinned conversation summary mementos
const pinnedCsumMems = await db.searchPinnedCsumMems(2000);
```

### Key Methods

- `addConversationMem`: Add a conversation memento to the database.
- `addFragmentMem`: Add a fragment memento to the database.
- `addDocAndSummary`: Add a document and its summary to the database.
- `addConvSummaryMem`: Add a conversation summary memento to the database.
- `getConversation`: Retrieve the conversation history as an array of messages.
- `searchMemsBySimilarity`: Search for mementos similar to a given user message.
- `searchPinnedCsumMems`: Retrieve pinned conversation summary mementos.
- `getSynopses`: Retrieve a list of synopses (short summaries) from the database.

## Examples

See the `src` directory for example usage of the `MementoDb` class.
