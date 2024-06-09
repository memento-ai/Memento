# Synopsis Agent
## Description
The Synopsis Agent is a component within the Memento application that generates a concise summary or "synopsis" of the latest conversational exchange between a user and an assistant. The synopsis is written from a shared perspective using the first-person plural tense and aims to capture the main idea of the exchange in a single, concise sentence under 50 tokens (approximately 40 words).

## Key Features
- Generates a synopsis of the latest user-assistant exchange
- Writes the synopsis in the first-person plural tense from a shared perspective
- Limits the synopsis to under 50 tokens for brevity
- Utilizes the conversation history (up to the last 1000 tokens of synopses) to provide context for the current exchange

## Usage and Examples
The Synopsis Agent is typically used as part of the larger Memento application, where it helps to provide a high-level summary of the conversation history. Here's an example of how the Synopsis Agent can be used:

```typescript
import { SynopsisAgent } from '@memento-ai/synopsis-agent';
import { MementoDb } from '@memento-ai/memento-db';
import { createConversation } from '@memento-ai/conversation';

// Create a Memento DB instance
const db = await MementoDb.create('my-database');

// Create a conversation instance
const conversation = createConversation('anthropic', { model: 'haiku', temperature: 0.0, max_response_tokens: 70, logging: { name: 'synopsis' } });

// Create a Synopsis Agent instance
const synopsisAgent = new SynopsisAgent({ db, conversation });

// Generate a synopsis of the latest exchange
const synopsis = await synopsisAgent.run();
console.log(synopsis);
```

In this example, the Synopsis Agent is used to generate a synopsis of the latest conversational exchange between the user and the assistant. The synopsis is then logged to the console.

The `SynopsisAgent` constructor takes an object with the following properties:
- `db`: An instance of `MementoDb` for accessing the conversation history
- `conversation`: An instance of `ConversationInterface` for generating the synopsis

The `run` method of the `SynopsisAgent` retrieves the latest user and assistant messages, along with up to the last 1000 synopses, and generates a prompt using the `synopsis-prompt-template`. It then sends this prompt, along with additional instructions, to the `conversation` instance to generate the synopsis, which is returned as a string.
