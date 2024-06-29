# Synopsis Agent
## Description
The Synopsis Agent is a component within the Memento application that generates a concise summary or "synopsis" of the latest conversational exchange between a user and an assistant. The synopsis captures the main idea of the exchange in a single sentence under 50 tokens (approximately 40 words), written from a shared perspective using the first-person plural tense.

## Key Features
- Generates a synopsis summarizing the main idea of the latest user-assistant exchange
- Writes the synopsis in the first-person plural tense from a shared perspective
- Limits the synopsis to under 50 tokens for brevity
- Utilizes the conversation history (up to the last 1000 tokens of previous synopses) to provide context for the current exchange

## Usage and Examples
The Synopsis Agent is typically used as part of the larger Memento application to provide a high-level summary of the conversation history. Here's an example of how to use the Synopsis Agent:

```typescript
import { SynopsisAgent } from '@memento-ai/synopsis-agent';
import { MementoDb } from '@memento-ai/memento-db';
import { createConversation } from '@memento-ai/conversation';

// Create a Memento DB instance
const db = await MementoDb.connect('my-database');

// Create a conversation instance
const conversation = createConversation('anthropic', { model: 'haiku', temperature: 0.0, max_response_tokens: 70, logging: { name: 'synopsis' } });

// Create a Synopsis Agent instance
const synopsisAgent = new SynopsisAgent({ db, conversation });

// Generate a synopsis of the latest exchange
const synopsis = await synopsisAgent.run();
console.log(synopsis);
```

In this example, the `SynopsisAgent` is instantiated with a `MementoDb` instance for accessing the conversation history and a `ConversationInterface` instance for generating the synopsis. The `run` method retrieves the latest user and assistant messages, along with up to 1000 tokens of the most recent synopses, generates a prompt using the `synopsis-prompt-template`, and sends this prompt to the `conversation` instance to generate the synopsis.

The `SynopsisAgent` constructor takes an object with the following properties:
- `db`: An instance of `MementoDb` for accessing the conversation history
- `conversation`: An instance of `ConversationInterface` for generating the synopsis

The `run` method of the `SynopsisAgent` retrieves the latest user and assistant messages, along with up to 1000 tokens of the most recent synopses, generates a prompt using the `synopsis-prompt-template`, and sends this prompt, along with additional instructions, to the `conversation` instance to generate the synopsis, which is returned as a string.
