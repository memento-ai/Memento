// Path: packages/memento-agent/src/prompt-partials/continuity_response.ts

import { stripCommonIndent } from "@memento-ai/utils";
import Handlebars from "handlebars";

export type ContinuityResponseTemplateArgs = {
    continuityResponseContent: string | null
};

const continuity_response_text = stripCommonIndent(`
    {{#if continuityResponseContent}}
    <continuity_response>
    {{continuityResponseContent}}
    </continuity_response>
    {{/if}}
`);

export const continuity_response = Handlebars.compile<ContinuityResponseTemplateArgs>(continuity_response_text);
