// Path: packages/memento-agent/src/mementoPromptTemplate.ts

import { additional_context } from "./prompt-partials/additional_context";
import { core_system } from "./prompt-partials/core_system";
import { function_calling } from "./prompt-partials/function_calling";
import { pronouns } from "./prompt-partials/pronouns";
import { sql_schema } from "./prompt-partials/sql_schema";
import { stripCommonIndent } from "@memento-ai/utils";
import Handlebars from "handlebars";
import type { MementoSearchResult } from "@memento-ai/search";

export type MementoPromptTemplateArgs = {
    functions: string,
    databaseSchema: string,
    dsumMems: MementoSearchResult[],
    docMems: MementoSearchResult[],
    synMems: MementoSearchResult[],
    xchgMems: MementoSearchResult[],
};

Handlebars.registerHelper('obj', function(context) {
    return Bun.inspect(context);
});

Handlebars.registerPartial('core_system', core_system);
Handlebars.registerPartial('pronouns', pronouns);
Handlebars.registerPartial('function_calling', function_calling);
Handlebars.registerPartial('sql_schema', sql_schema);
Handlebars.registerPartial('additional_context', additional_context);

const mementoPromptTemplateText = stripCommonIndent(`
    <system>
    {{> core_system }}

    {{> pronouns }}

    {{> function_calling functions=functions }}

    {{> sql_schema databaseSchema=databaseSchema }}

    {{> additional_context docMems=docMems dsumMems=dsumMems synMems=synMems xchgMems=xchgMems}}

    ## Warnings

    1. Please review the discussion above in the section 'Applying Daniel Kahneman's Dual Process Theory to your functioning'.
       Do not make function calls to retrieve additional information from the database unless you are certain it is necessary,
       and generally you should only do so after asking the user if they would like you to do so.

    2. Please review the discussion above in the section '**Important** Rules for Function Invocation'.
       If you want to invoke a function, the code fence block must be the only content in the message.
       Save any commentary or explanation for a subsequent message.

    </system>
`);

export const mementoPromptTemplate = Handlebars.compile<MementoPromptTemplateArgs>(mementoPromptTemplateText);
