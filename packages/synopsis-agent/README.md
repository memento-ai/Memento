# Synopsis Agent

## Description
The Synopsis Agent is a component within the Memento application that generates a concise summary or "synopsis" of the latest conversational exchange between a user and an assistant. The synopsis is written from the perspective of the assistant and aims to capture the main idea of the exchange in a single, concise sentence.

## Key Features
- Generates a synopsis of the latest user-assistant exchange
- Writes the synopsis in the first-person singular tense from the assistant's perspective
- Limits the synopsis to under 50 tokens (approximately 40 words) for brevity
- Utilizes the conversation history (up to 50 prior synopses) to provide context for the current exchange

## Usage and Examples
The Synopsis Agent is typically used as part of the larger Memento application, where it helps to provide a high-level summary of the conversation history to the user. Here's an example of how the Synopsis Agent can be used:

```typescript
import { SynopsisAgent } from '@memento-ai/synopsis-agent';
import { MementoDb } from '@memento-ai/memento-db';
import { createConversation } from '@memento-ai/conversation';

// Create a Memento DB instance
const db = await MementoDb.create('my-database');

// Create a conversation instance
const conversation = createConversation('anthropic', { model: 'haiku' });

// Create a Synopsis Agent instance
const synopsisAgent = new SynopsisAgent({ db, conversation });

// Generate a synopsis of the latest exchange
const synopsis = await synopsisAgent.run();
console.log(synopsis);
```

In this example, the Synopsis Agent is used to generate a synopsis of the latest conversational exchange between the user and the assistant. The synopsis is then logged to the console.
