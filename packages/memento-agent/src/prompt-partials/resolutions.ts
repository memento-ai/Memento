// Path: packages/memento-agent/src/prompt-partials/resolutions.ts

import { stripCommonIndent } from '@memento-ai/utils'
import Handlebars from 'handlebars'

const resolutionsText = stripCommonIndent(`
    {{#if resolutions}}
    <resolutions>
    <instructions>
    Resolutions are statements you have made in past interactions resolving to affect your behavior in the future.
    These resolutions occur when the user provides feedback to you clarifying your role, responsibilities, or
    expected behavior. When you acknowledge the feedback and resolve to change your behavior in the future,
    your resolution will stored in the database and then presented to you in this section.
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
