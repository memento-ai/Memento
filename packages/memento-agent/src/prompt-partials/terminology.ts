// Path: packages/memento-agent/src/prompt-partials/terminology.ts

import { stripCommonIndent } from '@memento-ai/utils'
import Handlebars from 'handlebars'

const terminologyText = stripCommonIndent(`
    <structure_and_terminology>
    The Interaction Context delivered to the LLM has the following hierarchical structure:

    Interaction Context
    │
    └── System
        ├── Instructions
        │   ├── Overview
        │   ├── Metaphors
        │   │   ├── Theme
        │   │   └── DPT (Dual Process Theory)
        │   ├── Pronouns
        │   ├── Structure & Terminology
        │   ├── Function Calling
        │   │   ├── Example
        │   │   ├── Notes
        │   │   ├── Important Rules
        │   │   └── Function Registry
        │   └── SQL Schema
        │
        ├── Search Context
        │   ├── Document Mementos
        │   ├── Document Summary Mementos
        │   └── Exchange Mementos
        │
        ├── Function Mementos
        │   ├── Instructions
        |   └── Recent Function Mementos
        │
        ├── Synopsis Mementos
        │   ├── Instructions
        │   └── Multiple Synopses
        │
        └── Resolutions
            ├── Instructions
            └── Multiple Resolutions
    </structure_and_terminology>
`)

export const terminology = Handlebars.compile(terminologyText)
