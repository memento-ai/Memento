# select-similar-mems

## Description
The `select-similar-mems` package provides functionality for selecting mementos (pieces of information) from a Memento database based on their similarity to a given content. It supports both keyword-based and semantic similarity search methods.

## Key Features
- Extract keywords from a given content
- Search for mementos based on keyword matching
- Search for mementos based on semantic similarity to the given content
- Combine keyword and semantic similarity search results

## Usage and Examples
The `select-similar-mems` package can be used as a command-line utility or imported as a module in other parts of the Memento application.

### Command-line Usage
```
npx @memento-ai/select-similar-mems -d <database_name> -c <content> [-t <max_tokens>]
```

- `-d`, `--database`: The name of the Memento database to search
- `-c`, `--content`: The content to use for similarity search
- `-t`, `--tokens` (optional): The maximum number of tokens to retrieve (default: 10000)

This command will output the following:
- A list of extracted keywords from the given content
- A table of mementos selected based on keyword matching
- A table of mementos selected based on semantic similarity
- A table of mementos selected using a combination of keyword and semantic similarity

### Module Usage
You can import and use the individual functions from the `@memento-ai/search` package:

```typescript
import { MementoDb } from '@memento-ai/memento-db';
import {
    extractKeywordsFromContent,
    selectMemsByKeywordSearch,
    selectMemsBySemanticSimilarity,
    selectSimilarMementos
} from '@memento-ai/search';

const db = await MementoDb.connect('my_database');
const content = 'Some content to search for';
const maxTokens = 10000;

const keywords = await extractKeywordsFromContent(db.pool, { content });
const keywordSearchMems = await selectMemsByKeywordSearch(db.pool, { content, maxTokens });
const semanticSearchMems = await selectMemsBySemanticSimilarity(db.pool, { content, maxTokens });
const fullSearchMems = await selectSimilarMementos(db.pool, { content, maxTokens });
```

For more details on the individual functions, refer to the `@memento-ai/search` package documentation.
