# @memento-ai/app

## Description
The `@memento-ai/app` package provides a command-line interface (CLI) for the Memento AI system and a utility for ingesting files into the Memento database.

## Key Features
- CLI for interacting with the Memento AI agent, persisting conversation history in a database
- Ingestion utility for adding files to the Memento database, with support for summarizing file content using a specified language model

## Usage and Examples

### CLI
To start the Memento AI chatbot, run the following command:

```
npx @memento-ai/app -p <provider> -m <model> -d <database>
```

- `-p, --provider <provider>`: The provider to use (e.g., `anthropic`, `ollama`, `openai`)
- `-m, --model <model>`: The name of the model to use
- `-d, --database <dbname>`: The name of the database to use
- `-x, --clean-slate` (optional): Drop the named database and start over

This will start the chatbot, which will persist the conversation history in the specified database. You can then interact with the chatbot by typing your messages and pressing Enter. To end the conversation, type `!!` and press Enter.

### Ingestion Utility
To ingest files into the Memento database, run the following command:

```
npx @memento-ai/app ingest -p <provider> -m <model> -d <database>
```

- `-p, --provider <provider>`: The provider to use (e.g., `anthropic`, `ollama`, `openai`)
- `-m, --model <model>`: The model to use for summarization
- `-d, --database <dbname>`: The name of the database to use
- `-x, --clean-slate` (optional): Drop the named database and start over
- `-C, --cwd <dir>` (optional): Use the specified directory as the current working directory
- `-D, --directory <dir>` (optional): The directory from which to recursively ingest files (default: `packages`)

This will recursively ingest all files in the `packages` directory (or the directory specified with the `-D, --directory` option) into the specified database. The ingestion utility supports the file types used to implement Memento, which are listed in the `SUPPORTED_EXTENSIONS` constant.

The ingestion utility uses the specified provider and model to summarize the content of the files before storing them in the database.
