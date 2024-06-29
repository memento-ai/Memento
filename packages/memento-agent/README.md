# @memento-ai/memento-agent
## Description
The `@memento-ai/memento-agent` package is a key component of the Memento system, an AI-powered conversational assistant designed to maintain long-term coherent context during open-ended dialogue over extended time periods. It implements the `MementoAgent`, which mediates the conversation between the 'user' and the 'assistant'.

This agent performs the crucial function of constructing the system prompt with dynamically generated additional context produced by the SynopsisAgent, along with additional content retrieved from the database using heuristics and semantic search.

## Key Features
- Integrates with a PostgreSQL database to store and retrieve conversation history and relevant information.
- Supports querying the database using similarity search to retrieve relevant context for a given message.
- Allows calling registered functions during the conversation, enabling dynamic updates to the database or other operations.
- Provides a dynamic prompt system that includes instructions for function calling and additional context from the database.
- Handles asynchronous function calls, allowing for background updates to the database while continuing the conversation.
- Supports configurable token limits for various types of content, such as conversation summaries, similarity search results, and synopses.
- Generates a concise summary or "synopsis" of the latest conversational exchange between the user and assistant.
- Allows the assistant to make "resolutions" to affect its future behavior based on user feedback.
- Implements a metaphor-based system inspired by the movie "Memento" to maintain context over extended conversations.
- Utilizes Daniel Kahneman's Dual Process Theory to balance intuitive (System 1) and analytical (System 2) thinking in responses.
- Supports multiple language model providers, including OpenAI, Anthropic, Google, Groq, and Ollama.
- Implements a sophisticated prompt system with core instructions, metaphors, pronoun usage guidelines, and terminology explanations.
- Uses Handlebars templating for generating dynamic prompts.

## Usage and Examples
The Memento Agent is designed to be used as part of the Memento system and is initialized with a conversation object, a database connection, and optional configuration parameters.

Here's an example of how to use the Memento Agent:

```typescript
import { createConversation } from "@memento-ai/conversation";
import { createMementoDb } from "@memento-ai/postgres-db";
import { MementoAgent, type MementoAgentArgs } from "@memento-ai/memento-agent";
import { nanoid } from "nanoid";
import { Config } from "@memento-ai/config";

async function main() {
    const dbname = `test_${nanoid()}`;
    await createMementoDb(dbname);
    const db = await MementoDb.connect(dbname);

    const config = Config.parse({ database: dbname });
    const conversation = createConversationFromConfig(config.memento_agent);

    const mementoAgentArgs: MementoAgentArgs = {
        conversation,
        db,
        config,
    };

    const mementoAgent = new MementoAgent(mementoAgentArgs);

    const args = { content: "What did Leonard Shelby suffer from?" };
    const message = await mementoAgent.run(args);
    console.log(message.content);

    await mementoAgent.close();
}

main();
```

In this example, we create a Memento Agent instance with a conversation object, a database connection, and a configuration. We then use the `run` method to send a message to the agent, which will query the database, retrieve relevant information, and generate a response.

The Memento Agent supports the ability to call functions that are registered in the `@memento-ai/function-registry` package. These functions can be used to perform various operations, such as updating summaries or adding synopses.

The agent implements a sophisticated prompt system that includes:
- Core system instructions
- Metaphors for maintaining context (inspired by the movie "Memento")
- Pronoun usage guidelines
- Function calling instructions
- SQL schema information
- Additional context from various types of "mementos" (document, summary, synopsis, and exchange)
- Resolutions made by the assistant
- Terminology explanations

This comprehensive prompt system allows the Memento Agent to maintain coherent and contextually relevant conversations over extended periods, making it particularly suitable for long-term, goal-oriented interactions with users.

The MementoAgent class extends the FunctionCallingAgent class and overrides the `generatePrompt` method to create a dynamic prompt using the Handlebars templating engine. This allows for flexible and context-aware prompt generation based on the current conversation state and retrieved information from the database.
