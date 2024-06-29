# Memento

Memento is a conversational AI system designed to maintain long-term coherent context during open-ended dialogue over extended time periods. While large language model chatbots can effectively use their context windows for short-term conversations, they inevitably lose crucial historical context once the conversation extends beyond the context window size. This makes it difficult to maintain a coherent understanding of overarching themes, goals, and discussion points when picking up a conversation thread after a long delay.

Most users, realizing this limitation, choose to simply start new conversation sessions rather than attempt to continue previous long-running dialogues where nuanced context would be lost.

Memento innovates by:

1. Storing the full conversation history and relevant documents in a PostgreSQL database.
2. Generating concise summaries to capture key points and context after conversational exchanges.
3. Using semantic search to retrieve relevant summaries and context before responding.
4. Allowing agents to create new summaries to extend and refine the contextual knowledge.

This permits Memento to reconstruct the overall narrative arc of the conversation, maintaining a coherent understanding of the discussion themes and the user's goals over an extended period.

The name "Memento" references the 2000 film, where the protagonist uses an elaborate system of notes and mementos to compensate for his inability to form new memories. Similarly, Memento the AI leverages its database of stored summaries to maintain rich contextual awareness.

Memento is a TypeScript application consisting of several core components handling conversation management, database interactions, embeddings, and more. The system can engage in open-ended dialogue while providing contextually relevant responses informed by its stored knowledge.

Memento draws core inspiration from the pioneering work of [MemGPT](https://memgpt.readme.io/) in developing retrieval-augmented conversational AI assistants.

## Project Organization

The project is organized as a monorepo, with multiple packages that provide different functionalities.

### Packages

The Memento monorepo contains the following packages:

- `@memento-ai/agent`: Provides an abstract `Agent` class that represents a conversational agent or a specialized tool.
- `@memento-ai/config`: Provides functionality for loading and managing configuration settings for the Memento AI application.
- `@memento-ai/conversation`: Provides an abstraction for interacting with different language models, such as OpenAI, Anthropic, Google, Groq, and Ollama.
- `@memento-ai/embedding`: Provides functionality for generating text embeddings using the Ollama language model.
- `@memento-ai/encoding`: Provides utility functions for encoding and decoding text using the `cl100k_base` encoding.
- `@memento-ai/function-calling`: Provides a framework for defining and invoking functions within the Memento application.
- `@memento-ai/ingester`: Provides functionality for ingesting and summarizing documents into a Memento database.
- `@memento-ai/memento-agent`: A key component of the Memento system, providing an interface for interacting with the Memento system and leveraging a database to store and retrieve information.
- `@memento-ai/memento-db`: Provides a TypeScript interface for interacting with a PostgreSQL database to store and retrieve "mementos" - pieces of information that are part of a conversational history.
- `@memento-ai/postgres-db`: Provides utilities for interacting with a PostgreSQL database used by the Memento AI system.
- `@memento-ai/readme-agents`: Provides agents for generating comprehensive README.md files for packages and the overall Memento project.
- `@memento-ai/resolution-agent`: Responsible for identifying and extracting explicit resolutions made by the assistant to change its future behavior based on user feedback.
- `@memento-ai/search`: Provides functionality for searching and retrieving relevant mementos from a Memento database based on keyword matching and semantic similarity.
- `@memento-ai/synopsis-agent`: Responsible for generating a concise summary or "synopsis" of the latest conversational exchange between a user and an assistant.
- `@memento-ai/types`: Provides the core data types and schemas used throughout the Memento application.
- `@memento-ai/utils`: Provides a set of utility functions and tools for the Memento project.

### Applications

The Memento monorepo also includes the following applications:

- `add-path-comments`: A utility application that adds or updates the "Path" comment at the top of TypeScript files in the Memento project.
- `ingest`: A command-line utility for ingesting files into a Memento database.
- `memento-cli`: A command-line interface (CLI) for interacting with the Memento AI system.
- `memento-web`: A web application built with SvelteKit, providing a user interface for interacting with the Memento AI system.
- `select-similar-mems`: A utility for selecting mementos from a Memento database based on their similarity to a given content.
- `update-readmes`: A utility for updating the README.md files across the Memento monorepo project.

## Requirements
- Memento requires ollama for generating embeddings, using the model 'nomic-embed-text'.
- Memento requires PostgreSQL, configured such that a connection to the url `postgres://localhost` is able to create databases.
- Memento is able to use models from these providers:
1. ollama (local)
2. OpenAI
3. Anthropic
4. Google
5. Groq
- Memento is currently configured such that any model used must have a context window of at least 16K tokens.
- Memento only functions well with the leading models provided by OpenAI, Anthropic, and Google.
- The best bang-for-the-buck models are:
1. Google's gemini-1.5-flash
2. Anthropic's haiku

## Getting Started

To get started with the Memento project, please refer to the README.md file in the individual packages for more information on their usage and examples.

See [apps/memento-cli/README.md](apps/memento-cli/README.md) for how to chat with Memento (web client UI coming soon).

See [apps/ingest/README.md](apps/ingest/README.md) for how to ingest files.

## Contributing

If you would like to contribute to the Memento project, please follow the standard GitHub workflow:

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes and commit them with descriptive commit messages
4. Push your changes to your forked repository
5. Open a pull request against the main Memento repository

Please ensure that your code follows the project's coding style and conventions, and that you have added appropriate tests and documentation for your changes.
