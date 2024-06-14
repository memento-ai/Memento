# @memento-ai/search

## Description
The `@memento-ai/search` package provides functionality for searching and retrieving relevant mementos (pieces of information) from a Memento database. It allows users to find mementos that are similar to a given content based on keyword matching and semantic similarity using vector embeddings.

## Key Features
- Extract keywords from a given content using TF-IDF scoring.
- Search for mementos similar to a given content based on keyword matching.
- Search for mementos semantically similar to a given content using vector embeddings.
- Combine keyword-based and semantic similarity-based search results to retrieve the most relevant mementos.
- Normalize search scores using linear normalization to ensure scores are in the range [0, 1].
- Limit search results based on a maximum token count to control the amount of information returned.
- Avoid returning redundant mementos for documents, synopses, and conversations.

## Usage and Examples
To use the `@memento-ai/search` package, you need to have a Memento database set up with a PostgreSQL connection pool.

Here's an example of how to perform a combined keyword and semantic similarity search:

```typescript
import { selectSimilarMementos } from '@memento-ai/search';

const similarMementos = await selectSimilarMementos(db.pool, {
  content: 'Your search content here',
  maxTokens: 5000,
  numKeywords: 5
});
```

The `selectSimilarMementos` function combines the results from keyword-based and semantic similarity-based searches, normalizes the scores, and returns the most relevant mementos limited by the specified `maxTokens`. It also avoids returning redundant mementos for documents, synopses, and conversations.

You can also perform keyword-based and semantic similarity-based searches separately:

```typescript
import { selectMemsByKeywordSearch, selectMemsBySemanticSimilarity } from '@memento-ai/search';

const keywordSearchResults = await selectMemsByKeywordSearch(db.pool, {
  content: 'Your search content here',
  maxTokens: 5000,
  numKeywords: 5
});

const semanticSearchResults = await selectMemsBySemanticSimilarity(db.pool, {
  content: 'Your search content here',
  maxTokens: 5000
});
```

The `selectMemsByKeywordSearch` function performs a keyword-based search using the extracted keywords from the given content, while the `selectMemsBySemanticSimilarity` function performs a semantic similarity-based search using vector embeddings.

The package also provides utility functions for normalizing search scores, combining search results, and converting search results to a similarity map:

```typescript
import { linearNormalize, combineSearchResults, asSimilarityMap } from '@memento-ai/search';

const normalizedResults = linearNormalize(searchResults, (item) => item.score);
const combinedResults = combineSearchResults({
  lhs: keywordSearchResults,
  rhs: semanticSearchResults,
  maxTokens: 5000
});
const similarityMap = await asSimilarityMap(searchResults);
```

These functions ensure that the search scores are in the range [0, 1] and can be used to adjust the relative importance of different search results. The `combineSearchResults` function combines the results of two memento searches into a single search result list, handling cases where mementos are present in one selection but not the other. The `asSimilarityMap` function converts the search results into a map where the keys are the memento IDs and the values are the corresponding search result objects.

### selectSimilarMemsUtil.ts

The `selectSimilarMemsUtil.ts` source file provides a very useful command-line utility for experimenting with semantic and keyword similarity searches. It can be used to observe examples of keyword and semantic search individually and when combined.

To use the utility, run the following command:

```bash
bun run packages/search/src/selectSimilarMemsUtil.ts -d <dbname> -t 10000 -c 'Tell me about the Memento Project'
```

Replace `<dbname>` with the name of your Memento database and provide the desired search content after the `-c` flag.

Output from selectSimilarMemsUtil is presented in easy to read tabular form using `console.table(...)`.

For more detailed usage and examples, please refer to the source code and tests in the `src` directory.
