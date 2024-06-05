// Path: packages/memento-agent/src/prompt-partials/additional_context.ts

import type { MementoSearchResult } from "@memento-ai/search";
import { stripCommonIndent } from "@memento-ai/utils";
import Handlebars from "handlebars";

export type AdditionalContextTemplateArgs = {
    dsumMems: MementoSearchResult[],
    docMems: MementoSearchResult[],
    synMems: MementoSearchResult[],
    xchgMems: MementoSearchResult[],
};

const additional_context_text = stripCommonIndent(`
    ## Additional Context
    The Memento system automatically retieves information it believes may be relevant to the current conversation.
    This additional context information is dynamically generated each time the user sends a new message.

    {{#if docMems}}
    ### Document Mementos
    {{#each docMems}}
    #### {{source}}
    \`\`\`
    {{{content}}}
    \`\`\`

    {{/each}}
    {{/if}}

    {{#if dsumMems}}
    ### Document Summary Mementos
    {{#each dsumMems}}
    #### {{source}}
    \`\`\`
    {{{content}}}
    \`\`\`

    {{/each}}
    {{/if}}

    {{#if csumMems}}
    ### Conversation Summary Mementos
    {{#each csumMems}}
    #### {{id}}
    {{{content}}}
    {{/each}}
    {{/if}}

    {{#if synMems}}
    ### Synopsis Mementos
    {{#each synMems}}
    - {{{content}}}
    {{/each}}
    {{/if}}

    {{#if xchgMems}}
    ### Exchange Mementos
    {{#each xchgMems}}
    #### {{ created_at }}
    {{{content}}}
    {{/each}}
    {{/if}}
`);

export const additional_context = Handlebars.compile<AdditionalContextTemplateArgs>(additional_context_text);
