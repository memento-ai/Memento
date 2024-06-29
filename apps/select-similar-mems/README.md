# select-similar-mems

## Description
The `select-similar-mems` package is a command-line utility for selecting mementos (pieces of information) from a Memento database based on their similarity to a given content. It leverages both keyword-based and semantic similarity search methods to provide comprehensive results.

## Key Features
- Extract keywords from given content
- Search for mementos using keyword matching
- Search for mementos using semantic similarity
- Combine keyword and semantic similarity search results
- Display results in a tabular format for easy comparison

## Usage and Examples

### Command-line Usage
```
npx @memento-ai/select-similar-mems -d <database_name> -c <content> [-t <max_tokens>]
```

Options:
- `-d`, `--database`: (Required) The name of the Memento database to search
- `-c`, `--content`: (Required) The content to use for similarity search
- `-t`, `--tokens`: (Optional) The maximum number of tokens to retrieve (default: 10000)

The command will output:
1. A list of extracted keywords from the given content
2. A table of mementos selected based on keyword matching
3. A table of mementos selected based on semantic similarity
4. A table of mementos selected using a combination of keyword and semantic similarity

### Example
```bash
npx @memento-ai/select-similar-mems -d my_memento_db -c "Artificial intelligence and machine learning" -t 5000
```

This command will search the "my_memento_db" database for mementos similar to the content "Artificial intelligence and machine learning", limiting the results to approximately 5000 tokens.

### Module Usage
While this package is primarily designed as a command-line tool, you can use the underlying functions from the `@memento-ai/search` package in your own TypeScript projects:

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
