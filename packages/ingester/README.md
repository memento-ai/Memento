# @memento-ai/ingester
## Description
The `@memento-ai/ingester` package provides functionality for ingesting and summarizing documents into a Memento database. It supports ingesting both individual files and entire directories, and uses a configurable summarizer to generate concise summaries of the documents.

## Key Features
- Ingest individual files or entire directories
- Supports TypeScript (.ts), SQL (.sql), and Markdown (.md) file types
- Configurable summarizer for generating document summaries
- Automatically deletes ingested files from the database if they no longer exist on the file system
- Retrieves a list of ingested files
- Supports multiple summarizer types:
  - Mock summarizer for testing
  - Chat-based summarizer using a conversation interface
  - Model-based summarizer using a specified provider and model
  - Ability to create custom summarizers by extending the `SummarizerAgent` class

## Usage and Examples
### Ingesting a File
```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { ingestFile, createMockSummarizer } from '@memento-ai/ingester';

const db = await MementoDb.connect('my-database');
const summarizer = createMockSummarizer();

const { docid, summaryid } = await ingestFile(db, 'path/to/file.ts', summarizer);
```

### Ingesting a Directory
```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { ingestDirectory, createMockSummarizer } from '@memento-ai/ingester';

const db = await MementoDb.connect('my-database');
const summarizer = createMockSummarizer();

await ingestDirectory({ db, dirPath: 'path/to/directory', summarizer });
```

### Getting Ingested Files
```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { getIngestedFiles } from '@memento-ai/ingester';

const db = await MementoDb.connect('my-database');
const ingestedFiles = await getIngestedFiles(db);
```

### Dropping Ingested Files
```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { dropIngestedFiles } from '@memento-ai/ingester';

const db = await MementoDb.connect('my-database');
await dropIngestedFiles(db);
```

### Summarizing a Document
```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { summarizeAndStoreDocuments, createModelSummarizer } from '@memento-ai/ingester';

const db = await MementoDb.connect('my-database');
const summarizer = createModelSummarizer({ provider: 'anthropic', model: 'haiku' });

const { docid, summaryid } = await summarizeAndStoreDocuments({
  db,
  source: 'path/to/file.ts',
  content: 'The content of the file',
  summarizer,
});
```

This example uses the `createModelSummarizer` function to create a summarizer that uses the `haiku` model from Anthropic. You can also use the `createMockSummarizer` or `createChatSummarizer` functions to create different types of summarizers.

### Creating a Custom Summarizer
You can create a custom summarizer by extending the `SummarizerAgent` class and implementing the `summarize` method:

```typescript
import { SummarizerAgent, type SummarizerArgs } from '@memento-ai/ingester';
import { createConversation } from '@memento-ai/conversation';
import { AssistantMessage } from '@memento-ai/types';

class CustomSummarizer extends SummarizerAgent {
  constructor() {
    super({ conversation: createConversation('provider', { model: 'model-name' }) });
  }

  async summarize({ content, source }: SummarizerArgs): Promise<AssistantMessage> {
    // Implement your custom summarization logic here
    const summary = `Custom summary for ${source}: ${content.slice(0, 50)}...`;
    return { role: 'assistant', content: summary };
  }
}
```

Then, you can use your custom summarizer when ingesting files or directories:

```typescript
import { MementoDb } from '@memento-ai/memento-db';
import { ingestFile } from '@memento-ai/ingester';
import { CustomSummarizer } from './CustomSummarizer';

const db = await MementoDb.connect('my-database');
const summarizer = new CustomSummarizer();

const { docid, summaryid } = await ingestFile(db, 'path/to/file.ts', summarizer);
```
