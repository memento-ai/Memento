# @memento-ai/embedding

## Description
The `@memento-ai/embedding` package provides functionality for generating text embeddings using the Ollama language model. Embeddings are vector representations of text that can be useful for various natural language processing tasks, such as text similarity, clustering, and classification.

## Key Features
- Generate embeddings for one or more text inputs
- Support for the 'nomic-embed-text' Ollama model
- Efficient batch processing of multiple text inputs

## Usage and Examples

### Importing the Package
```typescript
import { MyEmbeddingFunction, embedding } from '@memento-ai/embedding';
```

### Creating an Instance
```typescript
const embeddingInstance = new MyEmbeddingFunction();
```

### Using the Default Instance
```typescript
import { embedding } from '@memento-ai/embedding';

// Generate embeddings for multiple texts
const texts = ['hello world', 'goodbye world'];
const embeddings = await embedding.generate(texts);
console.log(embeddings); // [[...], [...]]

// Generate a single embedding
const singleEmbedding = await embedding.generateOne('hello world');
console.log(singleEmbedding); // [...]
```

### Generating Embeddings
```typescript
// Generate embeddings for multiple texts
const texts = ['hello world', 'goodbye world'];
const embeddings = await embeddingInstance.generate(texts);
console.log(embeddings); // [[...], [...]]

// Generate a single embedding
const singleEmbedding = await embeddingInstance.generateOne('hello world');
console.log(singleEmbedding); // [...]
```
