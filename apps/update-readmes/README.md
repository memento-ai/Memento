# update-readmes

## Description
The `update-readmes` package is a utility for updating the README.md files across the Memento monorepo project. It can update the README.md file for a specific package or the overall project README.md file.

## Key Features
- Update a single package's README.md file
- Update the overall project README.md file
- Leverage the Memento AI agents to generate or update the README content
- Specify the language model provider and model to use for summarization

## Usage and Examples

To run the `update-readmes` utility, use the following command:

```
nx run update-readmes --provider <provider> --model <model> [options]
```

### Options

- `-p, --provider <provider>`: The provider to use for the language model (e.g., `anthropic`, `ollama`, `openai`).
- `-m, --model <model>`: The specific language model to use for summarization.
- `-P, --package <package>` (optional): Update only the specified package's README.md file.
- `-R, --project-only` (optional): Update only the overall project README.md file.

Example usage:

```
# Update the README.md file for the @memento-ai/memento-agent package
nx run update-readmes --provider anthropic --model haiku --package @memento-ai/memento-agent

# Update the overall project README.md file
nx run update-readmes --provider openai --model gpt-3.5-turbo --project-only
```

The utility will generate or update the README.md content based on the package's source files and the current README.md content (if present). It will ensure that the README.md accurately reflects the package's features and usage.
