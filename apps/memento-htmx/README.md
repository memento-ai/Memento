# Memento HTMX

## Description
Memento HTMX is a web-based interface for the Memento AI system, providing a user-friendly chat interface and content display using HTMX for dynamic updates.

## Key Features
- Real-time chat interface with WebSocket communication
- Dynamic content updates using HTMX
- Markdown rendering for chat messages
- Expandable content chunks for additional information
- Responsive design for various screen sizes

## Usage and Examples

To run the Memento HTMX application:

1. Ensure you have the required dependencies installed:
   - Bun (for running TypeScript)
   - HTMX (included via CDN)
   - Required Memento AI packages

2. Set the `MEMENTO_CONFIG_TOML` environment variable to point to your Memento configuration file.

3. Start the application:

```bash
bun run src/main.ts
```

4. Open a web browser and navigate to `http://localhost:53530` (or the appropriate host and port).

5. Use the chat interface to interact with the Memento AI system. Type your messages in the input area and click "Send" or press Enter to submit.

6. Observe the conversation in the main chat area and related content chunks in the sidebar.

7. Click "Expand" on content chunks to view more detailed information.

The application uses WebSockets for real-time communication with the Memento AI system and HTMX for dynamic updates of the content chunks. The interface is designed to be intuitive and responsive, adapting to different screen sizes for a seamless experience on both desktop and mobile devices.
