# Memento HTMX

Memento HTMX is a web-based interface for the Memento AI system, designed for local development and single-user interaction. It provides a streamlined, efficient interface for conversing with the Memento AI, leveraging WebSocket technology for real-time communication.

## Features

- **Real-time Chat Interface**: Engage in conversations with the Memento AI system through a responsive chat interface.
- **WebSocket Communication**: Utilizes a persistent WebSocket connection for low-latency, bidirectional communication.
- **Streaming Responses**: Assistant responses are streamed in real-time, providing a fluid conversation experience.
- **Local Development**: Designed to run locally, allowing for rapid development and testing of the Memento system.

## Architecture

### Server-Side

- **Framework**: Built with Elysia, a performant TypeScript web framework.
- **Memento System**: Instantiates a single Memento system for the life of the server process.
- **WebSocket Handling**: Manages a persistent WebSocket connection for each client session.
- **Response Streaming**: Implements a streaming mechanism for assistant responses.

### Client-Side

- **HTMX**: Utilizes HTMX for seamless, AJAX-powered interactions.
- **WebSocket Client**: Implements a WebSocket client for real-time communication with the server.
- **Dynamic Content Updates**: Updates the chat interface in real-time as messages are received.

### Data Flow

1. User input is sent to the server via WebSocket.
2. The server processes the input using the Memento system.
3. The assistant's response is streamed back to the client via WebSocket.
4. The client updates the UI in real-time as response chunks are received.

## Setup and Running

1. See the *Getting Started* section in the project [README.md](../../README.md)
2. Create your configuration with a TOML file (see [@memento-ai/config/README.md](../../packages/config/README.md))
3. Set the ENV variable `MEMENTO_CONFIG_TOML` to the full path to your config file.
4. Run `bun dev` from the root directory of the project

## Future Improvements

### Context Mementos Viewer

We plan to enhance the user experience and provide deeper insights into the Memento system's operation through a new feature called the Context Mementos Viewer. This will be implemented in the `context-mementos` div.

Planned features include:

1. **Inspectable Listing**: Display an interactive list of mementos used in the system prompt for each interaction.
2. **Real-time Updates**: Dynamically update the displayed mementos as they are retrieved and used in the conversation.
3. **Filtering and Search**: Implement tools to filter and search through the mementos for easier navigation.
4. **Detailed View**: Allow users to click on mementos to see more detailed information.
5. **Relevance Visualization**: Add visual elements to represent the relevance or usage frequency of different mementos.
6. **Context Influence**: Enable users to interact with mementos to influence the conversation context.

### API Enhancements

- Expand the `/api/context-mementos` endpoint to serve actual context mementos.
- Implement pagination or lazy loading for efficient handling of large numbers of mementos.

### Development Tools

- Integrated testing interface for running and visualizing test conversations.
- Debugging panel for detailed insights into the system's decision-making process.
- Performance monitoring tools for tracking response times, token usage, and other metrics.
- Configuration interface for adjusting system parameters without server restarts.

These improvements aim to transform Memento HTMX into not just a user interface, but a comprehensive environment for development, debugging, and understanding the Memento AI system.

## Contributing

Please see the Contributing section of the project [README.md](../../README.md)
