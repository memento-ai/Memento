# @memento-ai/embedding

## Description
The `@memento-ai/embedding` package provides functionality for generating text embeddings using the Ollama language model. Embeddings are vector representations of text that can be useful for various natural language processing tasks, such as text similarity, clustering, and classification.

## Key Features
- Generate embeddings for one or more text inputs
- Support for different Ollama models (default: 'nomic-embed-text')
- Efficient batch processing of multiple text inputs

## Usage and Examples

### Importing the Package
```typescript
import { MyEmbeddingFunction } from '@memento-ai/embedding';
```

### Creating an Instance
```typescript
const embedding = new MyEmbeddingFunction();
// or with a custom model
const embedding = new MyEmbeddingFunction('custom-model');
```

### Generating Embeddings
```typescript
// Generate embeddings for multiple texts
const texts = ['hello world', 'goodbye world'];
const embeddings = await embedding.generate(texts);
console.log(embeddings); // [[...], [...]]

// Generate a single embedding
const singleEmbedding = await embedding.generateOne('hello world');
console.log(singleEmbedding); // [...]
```

### Example Usage
```typescript
import { MyEmbeddingFunction } from '@memento-ai/embedding';

const embedding = new MyEmbeddingFunction();

const text1 = 'The quick brown fox jumps over the lazy dog.';
const text2 = 'A quick red fox jumps over the sleeping cat.';

const embedding1 = await embedding.generateOne(text1);
const embedding2 = await embedding.generateOne(text2);

// Calculate the cosine similarity between the two embeddings
const cosineSimilarity = calculateCosineSimilarity(embedding1, embedding2);

console.log(`Cosine similarity between "${text1}" and "${text2}": ${cosineSimilarity}`);
```

In this example, we generate embeddings for two text inputs, calculate the cosine similarity between them, and print the result. The `calculateCosineSimilarity` function is not provided by the `@memento-ai/embedding` package and would need to be implemented separately.
