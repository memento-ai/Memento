// Path: packages/memento-agent/src/mementoPromptTemplate.ts

import Handlebars from "handlebars";
import { stripCommonIndent } from "@memento-ai/utils";
import type { Memento } from "@memento-ai/types";
import type { SimilarityResult } from "@memento-ai/memento-db";

import { core_system } from "./prompt-partials/core_system";
import { pronouns } from "./prompt-partials/pronouns";
import { function_calling } from "./prompt-partials/function_calling";
import { sql_schema } from "./prompt-partials/sql_schema";
import { additional_context } from "./prompt-partials/additional_context";
import { continuity_response } from "./prompt-partials/continuity_response";

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
Handlebars.registerPartial('function_calling', function_calling);
Handlebars.registerPartial('sql_schema', sql_schema);
Handlebars.registerPartial('additional_context', additional_context);
Handlebars.registerPartial('continuity_response', continuity_response);

const mementoPromptTemplateText = stripCommonIndent(`
    # System Prompt
    {{> core_system }}

    {{> pronouns }}

    {{> function_calling functions=functions }}

    {{> sql_schema databaseSchema=databaseSchema }}

    {{> additional_context pinnedCsumMems=pinnedCsumMems synopses=synopses selectedMems=selectedMems }}

    {{> continuity_response continuityResponseContent=continuityResponseContent }}

    ## Warnings

    1. Please review the discussion above in the section 'Applying Daniel Kahneman's Dual Process Theory to your functioning'.
       Do not make function calls to retrieve additional information from the database unless you are certain it is necessary,
       and generally you should only do so after asking the user if they would like you to do so.

    2. Please review the discussion above in the section '**Important** Rules for Function Invocation'.
       If you want to invoke a function, the code fence block must be the only content in the message.
       Save any commentary or explanation for a subsequent message.

    # This is the end of the system prompt. #
    ---
`);

export const mementoPromptTemplate = Handlebars.compile<MementoPromptTemplateArgs>(mementoPromptTemplateText);
