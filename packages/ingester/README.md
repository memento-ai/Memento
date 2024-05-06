# @memento-ai/ingester

## Description
The `@memento-ai/ingester` package provides functionality for ingesting and summarizing documents into a Memento database. It supports ingesting both individual files and entire directories, and uses a configurable summarizer to generate concise summaries of the documents.

## Key Features
- Ingest individual files or entire directories
- Supports TypeScript (.ts), SQL (.sql), and Markdown (.md) file types
- Configurable summarizer for generating document summaries
- Drop ingested files from the database
- Retrieve a list of ingested files

## Usage and Examples

### Ingesting a File
```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { ingestFile, createMockSummarizer } from '@memento-ai/ingester';

const db = await MementoDb.create('my-database');
const summarizer = createMockSummarizer();

const { docId, summaryId } = await ingestFile(db, 'path/to/file.ts', summarizer);
```

### Ingesting a Directory
```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { ingestDirectory, createMockSummarizer } from '@memento-ai/ingester';

const db = await MementoDb.create('my-database');
const summarizer = createMockSummarizer();

await ingestDirectory(db, 'path/to/directory', summarizer);
```

### Dropping Ingested Files
```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { dropIngestedFiles } from '@memento-ai/ingester';

const db = await MementoDb.create('my-database');
await dropIngestedFiles(db);
```

### Getting Ingested Files
```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { getIngestedFiles } from '@memento-ai/ingester';

const db = await MementoDb.create('my-database');
const ingestedFiles = await getIngestedFiles(db);
```

The package also includes a `summarizeDocument` module that provides a `Summarizer` interface and implementations for different summarization approaches, such as a mock summarizer, a chat-based summarizer, and a model-based summarizer.
