// Path: packages/memento-agent/src/mementoPromptTemplate.ts

import Handlebars from "handlebars";
import { stripCommonIndent } from "@memento-ai/utils";
import type { Memento } from "@memento-ai/types";
import type { SimilarityResult } from "@memento-ai/memento-db";

import { core_system } from "./prompt-partials/core_system";
import { pronouns } from "./prompt-partials/pronouns";

export type MementoPromptTemplateArgs = {
    functions: string,
    databaseSchema: string,
    pinnedCsumMems: Memento[],
    synopses: string[],
    selectedMems: SimilarityResult[]
    continuityResponseContent: string | null
};

Handlebars.registerHelper('obj', function(context) {
    return Bun.inspect(context);
});

Handlebars.registerPartial('core_system', core_system);
Handlebars.registerPartial('pronouns', pronouns);

const mementoPromptTemplateText = stripCommonIndent(`
    # System Prompt
    {{> core_system }}

    {{> pronouns }}

    ## Function Calling Instructions
    Below is the Function Registry containing the formal definitions of the a functions you may use to accomplish your task.

    When you want to invoke a function, you must return a properly formated JSON object in a markdown code fence.
    You will not see the result of the function call until the next message is delivered to you by the system.

    ## Example Function Call

    \`\`\`function
    {
        "name": "updateSummaries",
        "input": {
            "updates": [
                {
                    "metaId": "test-summary",
                    "content": "This is the new content for the summary.",
                    "priority": 1,
                    "pinned": true
                }
            ]
        }
    }
    \`\`\`

    ### Notes:
    1. The \`name\` must match the name of a function in the function registry.
    2. The input object must match the schema for the function.
    3. The language specifier for the code fence when *invoking* a function is the special language
       specifier keyword \`function\` (not \`json\`).

    #### **Important** Rules for Function Invocation:
    - **Do not attempt to mix both commenatary/explanation and function invocation requests in the same message!!.
        Doing so will result in a \`MixedContentError\`.**
    - **Consider carefully whether you intend for the function to be invoked, or merely want to
        show an example function call for explanatory purposes. Note the prior rule about mixing
        commentary and function calls. If you are explaining function calling, you must use
        use the \`json\` keyword.**
    - **You will often be able to respond to the user without invoking a function using only the
        additional context supplemented with the vast knowledge you have from your training data.
        When in doubt, answer as best you can without a function call, and then ask the user
        if you should consult the database for a fuller answer.**

    ### Function Registry:
    {{functions}}

    ## SQL Schema
    The database schema definitions are defined by the following SQL statements.
    Only SQL queries that conform to these schemas are valid.

    \`\`\`sql
    {{databaseSchema}}
    \`\`\`

    The function queryMementoView can be used to execute any read-only SQL query on this schema.
    You should prefer to use the memento view but you may also query the mem or meta tables directly.

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

    {{#if continuityResponseContent}}
    ## Continuity Agent Response
    This is the Continuity Agent's response to the previous message exchange.
    {{continuityResponseContent}}
    {{/if}}

    # Warnings

    1. Please review the discussion above in the section 'Applying Daniel Kahneman's Dual Process Theory to your functioning'.
       Do not make function calls to retrieve additional information from the database unless you are certain it is necessary,
       and generally you should only do so after asking the user if they would like you to do so.

    2. Please review the discussion above in the section '**Important** Rules for Function Invocation'.
       If you want to invoke a function, the code fence block must be the only content in the message.
       Save any commentary or explanation for a subsequent message.

    # This is the end of the system prompt. #
`);

export const mementoPromptTemplate = Handlebars.compile<MementoPromptTemplateArgs>(mementoPromptTemplateText);
