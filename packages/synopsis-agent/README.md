# Synopsis Agent

## Description
The Synopsis Agent is a component within the Memento application that generates a concise summary or "synopsis" of the latest conversational exchange between a user and an assistant. The synopsis captures the main idea of the exchange in a single sentence under 50 tokens (approximately 40 words), written from a shared perspective using the first-person plural tense.

## Key Features
- Generates a synopsis summarizing the main idea of the latest user-assistant exchange
- Writes the synopsis in the first-person plural tense from a shared perspective
- Limits the synopsis to under 50 tokens for brevity
- Utilizes the conversation history (up to the last 1000 tokens of previous synopses) to provide context for the current exchange
- Integrates with MementoDb for accessing conversation history
- Uses a customizable conversation interface for generating the synopsis

## Usage and Examples
The Synopsis Agent is typically used as part of the larger Memento application to provide a high-level summary of the conversation history. Here's an example of how to use the Synopsis Agent:

```typescript
import { SynopsisAgent, createSynopsisAgent } from '@memento-ai/synopsis-agent';
import { MementoDb } from '@memento-ai/memento-db';
import { Config } from '@memento-ai/config';

// Create a Memento DB instance
const db = await MementoDb.connect('my-database');

// Assuming you have a Config object
const config: Config = {
    // ... your configuration settings
};

// Create a Synopsis Agent instance
const synopsisAgent = await createSynopsisAgent(config, db);

if (synopsisAgent) {
    // Generate a synopsis of the latest exchange
    const synopsis = await synopsisAgent.run();
    console.log(synopsis);
} else {
    console.error('Failed to create Synopsis Agent');
}
```

In this example, the `createSynopsisAgent` function is used to create a `SynopsisAgent` instance with the provided configuration and database connection. The `run` method generates a synopsis of the latest exchange.

The `SynopsisAgent` class has the following key methods:

- `run()`: Retrieves the latest user and assistant messages, along with up to 1000 tokens of the most recent synopses, generates a prompt, and sends it to the conversation instance to generate the synopsis.
- `generatePrompt()`: Prepares the prompt for synopsis generation by fetching recent synopses and the latest user and assistant messages.

The `SynopsisAgent` uses a template-based approach with Handlebars to generate the prompt, ensuring consistent formatting and instructions for the synopsis generation.

Note: The Synopsis Agent relies on the configuration provided to create an appropriate conversation interface. Make sure your configuration is set up correctly to use the desired language model provider and settings.
