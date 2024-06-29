# @memento-ai/encoding

## Description
The `@memento-ai/encoding` package provides utility functions for encoding and decoding text using the `cl100k_base` encoding from the `tiktoken` library. It also includes a function for counting the number of tokens in a given text, including support for emoji characters.

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

const text = 'hello world 😃';
const tokenCount: number = count_tokens(text);

console.log(tokenCount); // Output: 3
```

The package uses the `tiktoken` library for encoding and decoding operations, and the `cl100k_base` encoding is used by default.

### Handling Emoji

The package supports encoding and decoding text with emoji characters:

```typescript
const textWithEmoji = 'hello world 😃';
const encoded = encode(textWithEmoji);
const decoded = decode_to_string(encoded);

console.log(decoded); // Output: 'hello world 😃'
```

Note that emoji characters may affect token count differently than regular text characters.
