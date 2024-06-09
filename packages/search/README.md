# @memento-ai/search
## Description
The `@memento-ai/search` package provides functionality for searching and retrieving relevant mementos (pieces of information) from a Memento database. It allows users to find mementos that are similar to a given content based on keyword matching and semantic similarity using vector embeddings.

## Key Features
- Extract keywords from a given content using TF-IDF scoring.
- Search for mementos similar to a given content based on keyword matching.
- Search for mementos semantically similar to a given content using vector embeddings.
- Combine keyword-based and semantic similarity-based search results to retrieve the most relevant mementos.
- Normalize search scores using softmax or linear normalization to ensure scores are in the range [0, 1].
- Limit search results based on a maximum token count to control the amount of information returned.

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

The `selectSimilarMementos` function combines the results from keyword-based and semantic similarity-based searches, normalizes the scores, and returns the most relevant mementos limited by the specified `maxTokens`.

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

The package also provides utility functions for normalizing search scores:

```typescript
import { softmaxNormalize, sumNormalize, linearNormalize } from '@memento-ai/search';

const normalizedResults = softmaxNormalize(searchResults, (item) => item.score);
```

These normalization functions ensure that the search scores are in the range [0, 1] and can be used to adjust the relative importance of different search results.

For more detailed usage and examples, please refer to the source code and tests in the `src` directory.
