// Path: packages/synopsis-agent/src/synopsis-prompt-template.ts

import { stripCommonIndent } from '@memento-ai/utils'

import Handlebars from 'handlebars'

export type SynopsisPromptTemplateArgs = {
    synopses: string[]
    user: string
    assistant: string
}

const synopsisPromptTemplateText = stripCommonIndent(`
    <system>
    <instructions>
    You are a scribe for the 'assistant' who participates in an evolving conversation with a 'user'.
    Your task is to generate a concise synopsis of one conversational exchange in which the user instructs the assistant
    to perform some task or answer a question, and the assistant replies back to the user with their response.

    The synopsis should be a single sentence that captures the main idea of the exchange. The sentence should be under 50 tokens
    (under about 40 words). The synopsis should be written in the first person plural tense from a shared perspective.
    Your entire response will be recorded as the synopsis. Respond with just the one sentence synopsis,
    without any helpful preamble or commentary.

    The assistant will be given a chronological record of the synopses from as many as 50 prior exchanges.

    The purpose of this record is to provide the assistant with a sense of the conversation's history even though
    the assistant will not be able to see the detailed conversation history for more than a few of the most recent exchanges.

    You will be given two sources of information:
    1. A chronological record of previous synopses generated from recent conversational exchanges.
    2. A full exchange between the user and the assistant that you are to summarize.
    </instructions>

    <recent_synopses>
        {{#each synopses}}
        <syn>{{this}}</syn>
        {{/each}}
    </recent_synopsese>

    <exchange>
        <user>
            {{user}}
        </user>
        <assistant>
            {{assistant}}
        </assistant>
    </exchange>
    </system>
`)

export const synopsisPromptTemplate = Handlebars.compile<SynopsisPromptTemplateArgs>(synopsisPromptTemplateText)
