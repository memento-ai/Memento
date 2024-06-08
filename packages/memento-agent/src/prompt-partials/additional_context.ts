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
    <additional_context>
    # Additional Context
    The Memento system automatically retieves information it believes may be relevant to the current conversation.
    This additional context information is dynamically generated each time the user sends a new message.

    {{#if docMems}}
    <document_mementos>
    {{#each docMems}}
    <document source="{{source}}">
    {{{content}}}
    {{/each}}
    </document_mementos>
    {{/if}}

    {{#if dsumMems}}
    <document_summary_mementos>
    {{#each dsumMems}}
    <dsum source="{{source}}">
    {{{content}}}
    </dsum>
    {{/each}}
    </document_summary_mementos>
    {{/if}}

    {{#if synMems}}
    <synopsis_mementos>
    {{#each synMems}}
    <syn>{{{content}}}</syn>
    {{/each}}
    </synopsis_mementos>
    {{/if}}

    {{#if xchgMems}}
    <exchange_mementos>
    {{#each xchgMems}}
    <xchg created_at="{{created_at}}">
    {{{content}}}
    </xchg>
    {{/each}}
    </exchange_mementos>
    {{/if}}

    </additional_context>
`);

export const additional_context = Handlebars.compile<AdditionalContextTemplateArgs>(additional_context_text);
