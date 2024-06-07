# @memento-ai/encoding

## Description
The `@memento-ai/encoding` package provides utility functions for encoding and decoding text using the `cl100k_base` encoding from the `tiktoken` library. It also includes a function for counting the number of tokens in a given text.

## Key Features
- Encode a string to a Uint32Array
- Decode a Uint32Array to a Uint8Array or a string
- Count the number of tokens in a given text

## Usage and Examples

### Encoding and Decoding

```typescript
import { encode, decode, decode_to_string } from '@memento-ai/encoding';

// Encode a string to a Uint32Array
const text = 'hello world';
const encoded: Uint32Array = encode(text);

// Decode a Uint32Array to a Uint8Array
const decoded: Uint8Array = decode(encoded);

// Decode a Uint32Array to a string
const decodedString: string = decode_to_string(encoded);

console.log(decodedString); // Output: 'hello world'
```

### Counting Tokens

```typescript
import { count_tokens } from '@memento-ai/encoding';

const text = 'hello world';
const tokenCount: number = count_tokens(text);

console.log(tokenCount); // Output: 2
```

The package uses the `tiktoken` library for encoding and decoding operations, and the `cl100k_base` encoding is used by default. It supports encoding and decoding of text containing emoji characters as well.
