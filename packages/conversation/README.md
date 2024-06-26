# @memento-ai/conversation
## Description
The `@memento-ai/conversation` package provides an abstraction for interacting with different language models, such as OpenAI, Anthropic, Google, Groq, and Ollama. It allows you to create and manage conversations with these models, handling tasks like sending messages, receiving responses, and managing conversation history.

## Key Features
- Supports multiple language model providers: OpenAI, Anthropic, Google, Groq, and Ollama
- Abstraction layer for creating and managing conversations with language models
- Ability to send messages and receive responses
- Support for streaming responses
- Configurable options for temperature, max response tokens, model selection, and logging
- Seed option for reproducible results (Ollama only)

## Usage and Examples
### Creating a Conversation
To use the package, you'll first need to create a `ConversationInterface` instance by calling the `createConversation` function and providing the desired provider and options:

```typescript
import { createConversation } from '@memento-ai/conversation';

const provider = 'anthropic';
const options = {
  model: 'haiku',
  temperature: 0.0,
  max_response_tokens: 64,
  logging: { name: 'my-conversation' }
};

const conversation = createConversation(provider, options);
```

### Sending Messages
You can then use the `sendMessage` method to send a message to the language model and receive a response:

```typescript
const prompt = "Answer all questions concisely, i.e give the shortest possible answer.";
const messages = [{ role: 'user', content: 'How many fingers on one hand?' }];

const args = {
  prompt,
  messages
};

const response = await conversation.sendMessage(args);
console.log(response.content); // Output: '5'
```

### Streaming Responses
The package supports streaming responses, which can be enabled by providing a `Writable` stream when creating the `ConversationInterface` instance:

```typescript
import { Writable } from 'stream';

const outStream = new Writable({
  write(chunk, encoding, callback) {
    console.log(chunk.toString());
    callback();
  }
});

const options = {
  model: 'haiku',
  stream: outStream
};

const conversation = createConversation('anthropic', options);
const args = {
  prompt,
  messages
};

await conversation.sendMessage(args);
```
In this example, the response from the language model will be written to the provided `outStream` as it is generated.

### Logging Conversations
Conversations can be logged to a file by providing a `logging` option when creating the `ConversationInterface` instance. The logs will be written to a directory structure based on the provider, model, and the provided name.

```
logs/
  my-conversation/
    anthropic/
      haiku/
        2023-04-01.md
        2023-04-02.md
        ...
```
Each log file contains the prompt, messages, and response for each conversation, separated by a delimiter.

### Using Different Providers
The package supports multiple providers. Here's an example of using the Google provider:

```typescript
const googleConversation = createConversation('google', {
  model: 'gemini-1.5-flash-latest',
  temperature: 0.0,
  max_response_tokens: 64
});

const response = await googleConversation.sendMessage(args);
console.log(response.content);
```

### Setting a Seed (Ollama only)
For reproducible results with Ollama, you can set a seed:

```typescript
const ollamaConversation = createConversation('ollama', {
  model: 'dolphin-phi',
  temperature: 0.0,
  max_response_tokens: 64,
  seed: 987
});

const response = await ollamaConversation.sendMessage(args);
console.log(response.content);
```

Note that the seed option is only available for the Ollama provider.
