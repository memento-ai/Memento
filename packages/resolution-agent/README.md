# @memento-ai/resolution-agent

## Description
The `@memento-ai/resolution-agent` package provides a Resolution Agent that monitors conversations between a user and an AI assistant. Its role is to identify and extract any resolutions made by the assistant to change its future behavior based on user feedback.

## Key Features
- Analyzes the most recent exchange between the user and assistant
- Identifies explicit resolutions made by the assistant to change its future behavior
- Extracts the resolution text and encloses it in `<resolution>` tags
- Handles cases where the assistant makes multiple resolutions in a single response

## Usage and Examples

To use the Resolution Agent, create an instance with the required arguments:

```typescript
import { ResolutionAgent } from '@memento-ai/resolution-agent';
import { createConversation } from '@memento-ai/conversation';
import { MementoDb } from '@memento-ai/memento-db';

const db = await MementoDb.create('my_database');
const conversation = createConversation('anthropic', { model: 'haiku' });

const resolutionAgentArgs = {
  db,
  conversation,
};

const resolutionAgent = new ResolutionAgent(resolutionAgentArgs);
```

Then, call the `run` method to analyze the latest exchange and extract any resolutions:

```typescript
const resolutionText = await resolutionAgent.run();
console.log(resolutionText);
```

The `resolutionText` will contain the extracted resolution(s) enclosed in `<resolution>` tags, or an empty `<resolution></resolution>` tag if no resolutions were identified.

Example output:

```
<resolution>Going forward, I will provide more detailed explanations when asked.</resolution>
```
