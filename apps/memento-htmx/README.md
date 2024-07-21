# Memento HTMX

Memento HTMX is a web-based interface for the Memento AI system, designed for local development and single-user interaction. It provides a streamlined, efficient interface for conversing with the Memento AI, leveraging WebSocket technology for real-time communication.

## Key Features

- **Real-time Chat Interface**: Engage in conversations with the Memento AI system through a responsive chat interface.
- **WebSocket Communication**: Utilizes a persistent WebSocket connection for low-latency, bidirectional communication.
- **Streaming Responses**: Assistant responses are streamed in real-time, providing a fluid conversation experience.
- **Local Development**: Designed to run locally, allowing for rapid development and testing of the Memento system.
- **Context Mementos Viewer**: Displays an interactive list of mementos used in the system prompt for each interaction.
- **Historical Synopses**: Shows a list of recent conversation synopses, allowing users to review past interactions.

## Usage and Examples

### Setup and Running

1. Ensure you have completed the *Getting Started* section in the project [README.md](../../README.md)
2. Create your configuration with a TOML file (see [@memento-ai/config/README.md](../../packages/config/README.md))
3. Set the ENV variable `MEMENTO_CONFIG_TOML` to the full path to your config file.
4. Run `bun dev` from the root directory of the project

### Interacting with the Chat Interface

1. Open your web browser and navigate to `http://localhost:53530`
2. Type your message in the input area at the bottom of the chat container
3. Press the "Send" button or hit Enter to send your message
4. The assistant's response will stream in real-time in the chat container

### Viewing Context Mementos

The Context Mementos Viewer on the right side of the interface displays the mementos used in the current conversation context. These are categorized into:

- Functions
- Document Summaries
- Documents
- Exchanges

This feature provides insight into the information the Memento system is using to generate responses.

### Exploring Historical Synopses

The chat interface displays recent conversation synopses. You can:

- Click on a synopsis to expand and view the full exchange
- Use this feature to review and continue past conversations

## Architecture

### Server-Side

- **Framework**: Built with Elysia, a performant TypeScript web framework.
- **Memento System**: Instantiates a single Memento system for the life of the server process.
- **WebSocket Handling**: Manages a persistent WebSocket connection for each client session.
- **Response Streaming**: Implements a streaming mechanism for assistant responses.
- **API Routes**: Provides endpoints for fetching context mementos, recent synopses, and individual mementos.

### Client-Side

- **HTMX**: Utilizes HTMX for seamless, AJAX-powered interactions.
- **WebSocket Client**: Implements a WebSocket client for real-time communication with the server.
- **Dynamic Content Updates**: Updates the chat interface in real-time as messages are received.
- **Markdown Rendering**: Uses the marked library to render markdown content in chat messages.

### Data Flow

1. User input is sent to the server via WebSocket.
2. The server processes the input using the Memento system.
3. The assistant's response is streamed back to the client via WebSocket.
4. The client updates the UI in real-time as response chunks are received.
5. Context mementos and historical synopses are updated after each interaction.

## Future Improvements

- Implement pagination or lazy loading for efficient handling of large numbers of mementos and synopses.
- Add filtering and search capabilities for context mementos and historical synopses.
- Develop an integrated testing interface for running and visualizing test conversations.
- Create a debugging panel for detailed insights into the system's decision-making process.
- Implement performance monitoring tools for tracking response times, token usage, and other metrics.
- Add a configuration interface for adjusting system parameters without server restarts.

These improvements aim to transform Memento HTMX into not just a user interface, but a comprehensive environment for development, debugging, and understanding the Memento AI system.

## Contributing

Please see the Contributing section of the project [README.md](../../README.md)
