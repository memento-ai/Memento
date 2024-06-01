# Continuity Agent
## Description
The Continuity Agent is a component of the Memento system responsible for maintaining high-level continuity and context across extended conversations. It analyzes the conversation history to determine if high-level summaries, known as "conversation summary" (CSUM) mementos, need to be created, updated, or removed. The Continuity Agent works in conjunction with the Synopsis Agent, which produces short summaries of each conversational exchange, to avoid redundancies and provide the necessary context to the Memento Agent.

## Key Features
- Analyzes conversation history to identify new major topics, important decisions, and significant clarifications
- Creates new CSUM mementos to capture high-level context not covered by existing mementos
- Updates existing CSUM mementos if the latest exchanges require clarification or expansion
- Removes or de-prioritizes CSUM mementos that have become redundant or obsolete
- Utilizes the `updateSummaries` function to create, update, or modify CSUM mementos, specifying the memo content, pinning status, and priority
- Avoids redundancy with the Synopsis Agent by considering the existing synopses
- Ensures the Memento Agent has the necessary high-level context to maintain continuity across extended conversations

## Usage and Examples
The Continuity Agent is a core component of the Memento system and is not intended to be used directly by the end-user. It is automatically invoked by the Memento Agent after each user message to analyze the conversation history and update the CSUM mementos accordingly.

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

In this example, the Continuity Agent is created with the necessary database connection and the provider and model to be used. The `run()` method is then called to analyze the conversation history and update the CSUM mementos as needed. The resulting message contains the Continuity Agent's analysis and any updates made to the CSUM mementos.
