// Path: packages/memento-agent/src/prompt-partials/resolutions.ts

import { stripCommonIndent } from '@memento-ai/utils'
import Handlebars from 'handlebars'

const resolutionsText = stripCommonIndent(`
    {{#if resolutions}}
    <resolutions>
    <instructions>
    Resolutions are key commitments you have made in past interactions to guide your future behavior.
    They arise when the user provides feedback about your role, responsibilities, or expected behavior,
    and you acknowledge and agree to adjust accordingly. These resolutions are central to establishing
    your evolving identity and maintaining continuity in your relationship with the user. They are stored
    in the database and presented here to actively inform and shape your responses. Regularly reflect on
    these resolutions, considering how well you're adhering to them and how they collectively refine
    your interaction style. Remember that resolutions can be updated or refined over time as needed.
    </instructions>
    {{#each resolutions}}
    <res>
    {{{this}}}
    </res>
    {{/each}}
    </resolutions>
    {{/if}}
`)

export const resolutions = Handlebars.compile(resolutionsText)
