# @memento-ai/memento-agent
## Description
The `@memento-ai/memento-agent` package is a key component of the Memento system, an AI-powered conversational assistant designed to collaborate closely with a human partner.

It implements the `MementoAgent`, the agent that mediates the conversation between the 'user' and the 'assistant'.

It performs the important function of constructing the system prompt with dynamically generated additional context produced by the SynopsisAgent along with additional content retrieved from the database using heuristics and semantic search.

## Key Features
- Integrates with a database to store and retrieve conversation history and relevant information.
- Supports querying the database using similarity search to retrieve relevant context for a given message.
- Allows calling registered functions during the conversation, enabling dynamic updates to the database or other operations.
- Provides a dynamic prompt system that includes instructions for function calling and additional context from the database.
- Handles asynchronous function calls, allowing for background updates to the database while continuing the conversation.
- Supports configurable token limits for various types of content, such as conversation summaries, similarity search results, and synopses.
- Generates a concise summary or "synopsis" of the latest conversational exchange between the user and assistant.
- Allows the assistant to make "resolutions" to affect its future behavior based on user feedback.

## Usage and Examples
The Memento Agent is designed to be used as part of the Memento system and is initialized with a conversation object, a database connection, and optional configuration parameters such as maximum token limits for various types of content.

Here's an example of how to use the Memento Agent:

```typescript
import { createConversation, type Provider } from "@memento-ai/conversation";
import { createMementoDb, type Interceptor } from "@memento-ai/postgres-db";
import { MementoAgent, type MementoAgentArgs } from "@memento-ai/memento-agent";
import { nanoid } from "nanoid";

const provider: Provider = 'anthropic';
const model: string = 'haiku';

const interceptors: Interceptor[] = [{
    queryExecutionError: async (e, query) => {
        console.error(e, query);
        return null;
    }
}];

async function main() {
    const dbname = `test_${nanoid()}`;
    await createMementoDb(dbname, interceptors);
    const db = await MementoDb.create(dbname, interceptors);

    const mementoChatArgs: MementoAgentArgs = {
        conversation: createConversation(provider, { model, temperature: 0.0 }),
        db,
    };

    const mementoAgent = new MementoAgent(mementoChatArgs);

    const args = { content: "What did Leonard Shelby suffer from?" };
    const message = await mementoAgent.send(args);
    console.log(message.content);

    await mementoAgent.close();
    await dropDatabase(dbname);
}

main();
```

In this example, we create a Memento Agent instance with a conversation object and a database connection. We then use the `send` method to send a message to the agent, which will query the database, retrieve relevant information, and generate a response.

The Memento Agent also supports the ability to call functions that are registered in the `@memento-ai/function-calling` package. These functions can be used to perform various operations, such as updating summaries or adding synopses.
