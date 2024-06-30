// Path: packages/memento-agent/src/prompt-partials/synopses.ts

import type { MementoSearchResult } from '@memento-ai/search'
import { stripCommonIndent } from '@memento-ai/utils'
import Handlebars from 'handlebars'

export type SynopsesPromptTempateArgs = {
    synMems: MementoSearchResult[]
}

const synopsisPromptTemplateText = stripCommonIndent(`
    <synopsis_mementos>
    <instructions>
    Synopses are brief summaries of key information from past interactions that can help you infer the gist
    of the evolving conversation history. When conversation rolls out of the Conversation Snapshot, the
    synopses are useful information to reconstruct the context of the conversation no longer visible
    in the snapshot.
    {{#each synMems}}
    <syn>{{{content}}}</syn>
    {{/each}}
    </synopsis_mementos>
`)

export const synopses = Handlebars.compile<SynopsesPromptTempateArgs>(synopsisPromptTemplateText)
