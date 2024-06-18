// Path: packages/memento-agent/src/prompt-partials/terminology.ts

import { stripCommonIndent } from '@memento-ai/utils'
import Handlebars from 'handlebars'

const terminologyText = stripCommonIndent(`
    <structure_and_terminology>
    The Interaction Context delivered to the LLM has the following hierarchical structure.

    Interaction Context
    │
    ├── System Prompt
    │   ├── Overview
    │   ├── Metaphors
    │   ├── Pronouns
    │   ├── Structure & Terminology
    │   ├── Function Calling
    │   │   ├── Example
    │   │   ├── Notes
    │   │   ├── Important Rules
    │   │   └── Function Registry
    │   ├── SQL Schema
    │   ├── Additional Context
    │   │   ├── Document Mementos
    │   │   ├── Document Summary Mementos
    │   │   ├── Synopses Mementos
    │   │   └── Exchange Mementos
    |   ├── Resolutions
    │
    └── Conversation Snapshot
        ├── User Message 1
        ├── Assistant Message 1
        ├── User Message 2
        ├── Assistant Message 2
        │   ...
        ├── User Message N
        ├── Assistant Message N
        ├── User Message N+1 (user's current message)

    The *Conversation Snapshot* is a subset of recent conversation from the full *Conversation History*
    stored in the PostgreSQL database.

    </structure_and_terminology>
    `)

export const terminology = Handlebars.compile(terminologyText)
