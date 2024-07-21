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
- `@memento-ai/function-registry`: Provides a framework for defining, registering, and managing functions within the Memento AI system.
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
- `memento-cli`: A command-line interface (CLI) for interacting with the Memento AI system. (***deprecated***)
- `memento-htmx`: A web-based user interface for interacting with the Memento AI system. (**new, recommended**)
- `select-similar-mems`: A utility for selecting mementos from a Memento database based on their similarity to a given content.
- `transcript-generator`: A command-line utility designed to generate formatted transcripts from Memento conversation data stored in a PostgreSQL database.
- `update-readmes`: A utility for updating the README.md files across the Memento monorepo project.

## Getting Started

### Requirements

- Memento requires ollama for generating embeddings, using the model 'nomic-embed-text'.
- Memento requires PostgreSQL, configured such that a connection to the url `postgres://localhost` is able to create databases. We use [Postgres.app](https://postgresapp.com) on MacOS which works beautifully. We also require the [pgvector](https://github.com/pgvector/pgvector) extension to be installed on the PostgreSQL server.

### Recommendations

- Memento is able to use models from a variety of providers, including:
    1. ollama (local)
    2. OpenAI
    3. Anthropic
    4. Google
    5. Groq

- **However, we highly recommend Sonnet 3.5.**
    - The user experience and performance of Sonnet 3.5 is superior to the other models we have tested.
    - All recent development has been done with this model. Even though other models may work (i.e. be
        able to execute functions by emitting proper function call requests), it is likely that some
        tuning of prompts will be required to adapt to using model. If you want to try to use a different
        model, open an issue so that we can discuss any problems you encounter.

### Setting up
At this time you *must* clone the repo and you *must* use `bun`. No effort has yet been made to publish NPM packages or test
with `node`/`npm`. To get started, please follow these steps:

```bash
git clone https://github.com/memento-ai/Memento.git
cd Memento
bun install
```

### Create a memento.toml configuration file

1. Start with the example.memento.toml in the root of the project.
You will likely want to experiment with different LLM models (we *highly* recommend Sonnet 3.5 for best results) and possibly with some of the settings such as `search_context.tokens`.

2. Choose a database name. You can start with the name 'memento' but if you spend more than a few days with Memento you will possibly end up creating multiple database instances. I use names like `db_sonnet35_jul_8`. Specify that name in your memento.toml
file.

### Create a database by running the ingest application

The `apps/ingest` application is currently setup to ingest
the Memento project itself (yes, it will eventually be able to
ingest other git repos and documents).

See [apps/ingest/README.md](apps/ingest/README.md) for how to ingest files.

### Run the memento-htmx app

See [apps/memento-htmx/README.md](apps/memento-htmx/README.md) for how to chat with Memento using a simple web chatbot interface.
This app will be an active area of development going forward.

## Contributing

If you would like to contribute to the Memento project, please follow the standard GitHub workflow:

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes and commit them with descriptive commit messages
4. Push your changes to your forked repository
5. Open a pull request against the main Memento repository

Please ensure that your code follows the project's coding style and conventions, and that you have added appropriate tests and documentation for your changes.
