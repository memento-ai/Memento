# @memento-ai/ingest

## Description
The `@memento-ai/ingest` package is a command-line utility for ingesting files into a Memento database. It supports ingesting various file types used in the Memento project, such as TypeScript (`.ts`), SQL (`.sql`), and others.

## Key Features
- Recursively ingest files from a specified directory into a Memento database.
- Support for ingesting multiple file types, including TypeScript (`.ts`) and SQL (`.sql`).
- Option to create a new database or use an existing one.
- Ability to specify the language model provider (e.g., Anthropic, OpenAI, Ollama) and model for summarization.
- Clean-slate option to drop the existing database and start over.
- Utility functions for managing the Memento database, such as creating, wiping, and connecting to databases.
- Automatically creates a template database for the specified provider and model if it doesn't exist.
- Copies ingested mementos from the template database to the target database.
- Removes abandoned files (files that were previously ingested but no longer exist) from the target database.
- Deletes unreferenced mementos (mementos that are not referenced by any other memento) from the target database.
- Displays a table of the 10 largest documents ingested into the target database.

## Usage and Examples

To use the `@memento-ai/ingest` package, run the following command:

```
nx run ingest --provider=<provider> --model=<model> --database=<dbname> [options]
```

Replace `<provider>` with the desired language model provider (e.g., `anthropic`, `ollama`, `openai`), `<model>` with the specific model to use for summarization, and `<dbname>` with the name of the database to use.

Available options:

- `-d, --database <dbname>`: The name of the database to use.
- `-x, --clean-slate`: Drop the named database and start over.
- `-p, --provider <provider>`: The provider to use (e.g., `anthropic`, `ollama`, `openai`).
- `-m, --model <model>`: The model to use for summarization.
- `-C, --cwd <dir>`: Use the specified directory as the current working directory (default: `.`).
- `-D, --directory <dir>`: The directory from which to recursively ingest files (default: `.`).

Example usage:

```
nx run ingest --provider=anthropic --model=haiku --database=my-memento-db
```

This command will ingest files from the current directory into a database named `my-memento-db`, using the Anthropic provider and the `haiku` model for summarization. If a template database for the Anthropic provider and `haiku` model doesn't exist, it will be created. The ingested mementos will be copied from the template database to the `my-memento-db` database, and any abandoned files or unreferenced mementos will be removed from `my-memento-db`.
