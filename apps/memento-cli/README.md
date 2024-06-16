# @memento-ai/memento-cli

## Description
The `@memento-ai/memento-cli` package provides a command-line interface (CLI) for interacting with the Memento AI system. It allows users to engage in conversational interactions with the AI assistant, leveraging the Memento system's capabilities for maintaining long-term context and coherence.

## Key Features
- Interactive command-line interface for conversing with the Memento AI assistant.
- Utilizes the Memento system's database to store and retrieve conversation history, summaries, and relevant context.
- Supports multi-line input for more complex queries or instructions.
- Provides visual cues and prompts for a seamless conversational experience.

## Usage and Examples

To start the Memento CLI, run the following command:

```
nx run memento-cli:serve
```

This will start the CLI application, and you will be prompted to enter your input. You can type your messages and press Enter to send them to the AI assistant.

### Multi-line Input
The CLI supports multi-line input, which can be useful for providing more detailed instructions or context. To enter multi-line mode, type `!!` and press Enter. You can then enter multiple lines of text. To submit the multi-line input, type `**` and press Enter.

Example:

```
You: !!
> This is a multi-line input.
> It can span multiple lines.
> **
Assistant: [Assistant's response to the multi-line input]
```

### Exiting the CLI
To exit the Memento CLI, you can press `Ctrl+C` or type `exit` and press Enter.
