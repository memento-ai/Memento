// Path: packages/memento-agent/src/prompt-partials/additional_context.ts

import type { SimilarityResult } from "@memento-ai/memento-db";
import type { Memento } from "@memento-ai/types";
import { stripCommonIndent } from "@memento-ai/utils";
import Handlebars from "handlebars";

export type AdditionalContextTemplateArgs = {
    pinnedCsumMems: Memento[],
    synopses: string[],
    selectedMems: SimilarityResult[]
};

const additional_context_text = stripCommonIndent(`
    ## Additional Context
    The Memento system automatically retieves information it believes may be relevant to the current conversation.
    This additional context information is dynamically generated each time the user sends a new message.

    ### Pinned Conversation Summaries
    {{#each pinnedCsumMems}}
    - {
        metaid: "{{id}}"
        priority: {{priority}}
        pinned: {{pinned}}
        content: "{{content}}"
    }
    {{/each}}

    ### Synopses
    {{#each synopses}}
    - {{this}}
    {{/each}}

    ### Selected Mems
    {{#each selectedMems}}
    - {
        kind: "{{kind}}"
        content: "{{content}}"
    }
    {{/each}}
`);

export const additional_context = Handlebars.compile<AdditionalContextTemplateArgs>(additional_context_text);
