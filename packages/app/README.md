# @memento-ai/app

## Description
The `@memento-ai/app` package provides a command-line interface (CLI) for interacting with the Memento AI system, as well as utilities for ingesting files into the Memento database and updating README.md files across the Memento monorepo.

## Key Features
- CLI for interacting with the Memento AI agent, persisting conversation history in a database
- Ingestion utility for adding files to the Memento database, with support for summarizing file content using a specified language model
- Utility for updating README.md files across the Memento monorepo packages

## Usage and Examples

### Ingestion Utility
To ingest files into a new Memento database, run the following command:

```
bun run packages/app/src/ingest.ts -p <provider> -m <model> -d <database> --clean-slate
```

Note that `--clean-slate` will drop the specified database if it already exists, and recreate it from scratch. You can reingest into the same database later, but don't forget to omit the `--clean-slate` option!

The options are:
- `-p, --provider <provider>`: The provider to use (e.g., `anthropic`, `ollama`, `openai`)
- `-m, --model <model>`: The model to use for summarization
- `-d, --database <dbname>`: The name of the database to use
- `-x, --clean-slate` (optional): Drop the named database and start over
- `-C, --cwd <dir>` (optional): Use the specified directory as the current working directory (default: `.`)
- `-D, --directory <dir>` (optional): The directory from which to recursively ingest files (default: `packages`)

This will recursively ingest all files in the `packages` directory (or the directory specified with the `-D, --directory` option) into the specified database. The ingestion utility supports the file types used to implement Memento, which are listed in the `SUPPORTED_EXTENSIONS` constant.

The ingestion utility uses the specified provider and model to summarize the content of the files before storing them in the database.

### Chat CLI

To start the Memento AI chatbot, run the following command:

```
bun run packages/app/src/cli.ts -p <provider> -m <model> -d <database>
```

- `-p, --provider <provider>`: The provider to use (e.g., `anthropic`, `ollama`, `openai`, ...)
- `-m, --model <model>`: The name of the model to use
- `-d, --database <dbname>`: The name of the database to use
- `-x, --clean-slate` (optional): Drop the named database and start over

This will start the chatbot, which will persist the conversation history in the specified database. You can then interact with the chatbot by typing your messages and pressing Enter.

To enter multi-line messages, type '!!' and press Enter to begin multi-line mode. While in this mode, to send a message, type '**' and press Enter. To exit multi-line mode, use the !! command again.

### README Update Utility

To update the README.md files across the Memento monorepo packages, run the following command:

```
bun run packages/app/src/update-readmes.ts -p <provider> -m <model>
```

- `-p, --provider <provider>`: The provider to use (e.g., `anthropic`, `ollama`, `openai`, ...)
- `-m, --model <model>`: The model to use for generating the README content

This utility will process each package in the `packages` directory, generating a README.md file based on the package's source code and the existing project README.md. It will also update the main project README.md file.
