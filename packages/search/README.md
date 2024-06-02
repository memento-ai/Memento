# @memento-ai/search
## Description
The `@memento-ai/search` package provides functionality for searching and retrieving relevant mementos (pieces of information) from a Memento database using keyword-based and semantic similarity-based search techniques.
## Key Features
- Extract keywords from a given content using TF-IDF scoring
- Search for mementos similar to a given content based on keyword matching
- Search for mementos semantically similar to a given content using vector embeddings
- Build a similarity index to organize and retrieve related mementos efficiently
- Load sets of mementos based on their IDs
## Usage and Examples
To use the `@memento-ai/search` package, you need to have a Memento database set up with a PostgreSQL connection pool.

Here's an example of how to perform a keyword-based search:

```typescript
import { selectMemsByKeywordSearch } from '@memento-ai/search';

const mementosSimilarToContent = await selectMemsByKeywordSearch(db.pool, {
  content: 'Your search content here',
  maxTokens: 1000
});
```

And here's an example of performing a semantic similarity-based search:

```typescript
import { selectMemsBySemanticSimilarity } from '@memento-ai/search';

const result = await selectMemsBySemanticSimilarity(db.pool, 'Your search content here', 1000);
const semanticallySimilarMementos = Object.values(result).sort((a, b) => b.similarity - a.similarity);
```

You can also build a similarity index to organize and retrieve related mementos:

```typescript
import { makeSimilarityIndex } from '@memento-ai/search';

const index = makeSimilarityIndex(result);
```

For more detailed usage and examples, please refer to the source code and tests in the `src` directory.
