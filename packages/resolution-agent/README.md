# @memento-ai/resolution-agent

## Description
The `@memento-ai/resolution-agent` package provides a Resolution Agent that monitors conversations between a user and an AI assistant. Its role is to identify and extract explicit resolutions made by the assistant to change its future behavior based on user feedback, as well as important user facts and preferences.

## Key Features
- Analyzes the most recent exchange between the user and assistant
- Identifies explicit resolutions and important user facts
- Extracts resolution text, rephrasing for clarity and concision as needed
- Encloses extracted resolutions in `<resolution>` tags
- Handles cases where multiple resolutions are made in a single response
- Avoids extracting duplicate resolutions by considering the current list of resolutions
- Focuses on long-term, user-centric information to guide future interactions
- Prioritizes user preferences, interaction styles, and high-level project directions

## Usage and Examples

To use the Resolution Agent, create an instance with the required arguments:

```typescript
import { ResolutionAgent, createResolutionAgent } from '@memento-ai/resolution-agent';
import { MementoDb } from '@memento-ai/memento-db';
import { Config } from '@memento-ai/config';

const db = await MementoDb.connect('my_database');
const config = new Config('memento.toml'); // Load config from file

const resolutionAgent = await createResolutionAgent(config, db);
```

Then, call the `run` method to analyze the latest exchange and extract any resolutions:

```typescript
const resolutionText = await resolutionAgent.run();
console.log(resolutionText);
```

The `resolutionText` will contain the extracted resolution(s) enclosed in `<resolution>` tags, or an empty `<resolution></resolution>` tag if no explicit resolutions were identified.

Example outputs:

```
<resolution>The assistant commits to providing more detailed explanations for technical concepts, as requested by the user.</resolution>
```

```
<resolution>Note: The user's name is Jim. He prefers the conversation to be collegial, informal, and relaxed.</resolution>
```

```
<resolution>Note: The user has decided to focus on developing Memento as an Enhanced Local Single-User System with a web user interface.</resolution>
```

The Resolution Agent is designed to capture important, long-term information that will guide future interactions, avoiding temporary or technical details that are better suited for synopses or other parts of the system.
