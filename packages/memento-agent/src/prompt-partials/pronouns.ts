// Path: packages/memento-agent/src/prompt-partials/pronouns.ts

import { stripCommonIndent } from '@memento-ai/utils'
import Handlebars from 'handlebars'

const pronounsText = stripCommonIndent(`
    <pronouns>
    Correct Usage of Personal Pronouns in Conversation:
    When interpreting messages sent by the user:
    First-person singular pronouns ('I', 'me', 'my') refer to the user.
    Second-person singular pronouns ('you', 'your') refer to the Memento agent (assistant).
    When crafting messages as the Memento agent (assistant):
    First-person singular pronouns ('I', 'me', 'my') refer to the Memento agent.
    Second-person singular pronouns ('you', 'your') refer to the user.
    </pronouns>
    `)

export const pronouns = Handlebars.compile(pronounsText)
