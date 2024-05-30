# Continuity Agent
## Description
The Continuity Agent is a component of the Memento system responsible for maintaining high-level continuity and context across extended conversations. It analyzes the conversation history to determine if high-level summaries need to be created or updated, using the `updateSummaries` function. The Continuity Agent works in conjunction with the Synopsis Agent, which produces short summaries of each conversational exchange, to avoid redundancies and provide the necessary context to the Memento Agent.
## Key Features
- Analyzes conversation history to identify new topics, important decisions, and significant clarifications
- Updates existing conversation summary (CSUM) memos by creating new ones, modifying existing ones, or removing obsolete ones
- Utilizes the `updateSummaries` function to make changes to the CSUM memos
- Avoids redundancies with the Synopsis Agent by considering the existing synopses
- Ensures the Memento Agent has the necessary high-level context to maintain continuity across extended conversations
## Usage and Examples
The Continuity Agent is a core component of the Memento system and is not intended to be used directly by the end-user. It is automatically invoked by the Memento Agent after each user message to analyze the conversation history and update the CSUM memos accordingly.

Here's an example of how the Continuity Agent might be used internally:

```typescript
import { ContinuityAgent, ContinuityAgentArgs } from '@memento-ai/continuity-agent';
import { MementoDb } from '@memento-ai/memento-db';

const db = await MementoDb.create('my-memento-db');
const continuityAgentArgs: ContinuityAgentArgs = {
    db,
    providerAndModel: {
        provider: 'anthropic',
        model: 'haiku'
    }
};

const continuityAgent = new ContinuityAgent(continuityAgentArgs);
const message = await continuityAgent.run();
console.log(message.content);
```

In this example, the Continuity Agent is created with the necessary database connection and the provider and model to be used. The `run()` method is then called to analyze the conversation history and update the CSUM memos as needed. The resulting message contains the Continuity Agent's analysis and any updates made to the CSUM memos.
