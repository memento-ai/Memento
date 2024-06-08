// Path: packages/function-calling/src/functionRegistryTemplate.ts

import Handlebars from "handlebars";
import { type FunctionConfig } from "./functionRegistry";

export const function_description_template = Handlebars.compile(`
Function: {{name}}
Purpose: {{purpose}}
{{#if async}}
Async: {{async}}
{{/if}}
Input: {{input}}
Output: {{output}}
{{#if extraTypes}}
Nested Types:
{{#each extraTypes}}
{{this}}
{{/each}}
{{/if}}
`);

// Handlebars.registerPartial("function_description", function_description_template);

// export function function_description<Input, Output>({name, async, extraTypes}: FunctionConfig<Input, Output>) {

//     const prompt = function_description_template({name, async, extraTypes});

//     return prompt;
// }



export const function_registry_template = Handlebars.compile(`
## Function Registry
{{#each function}}
{{> function_description this}}
{{/each}}
`);

Handlebars.registerPartial(
    "function_registry",
    function_registry_template
)

export const function_prompt_template = Handlebars.compile(`
## Function Calling Instructions
Below is the Function Registry containing the formal definitions of the a functions you may use to accomplish your task.

When you want to invoke a function, you must return a properly formated JSON object in a markdown code fence.
You will not see the result of the function call until the next message is delivered to you by the system.
Do not attempt to both reply to the user and invoke a function in the same message.
If you invoke a function call, that invocation should be the only content in that response.

This is an example of a function call request:

\`\`\`function
{
    "name": "gitListFiles",
    "input": {}
}
\`\`\`

Notes:
1. The language specifier for the code fence is the special keyword \`function\` (not \'json\').
2. The \`name\` must match the name of a function in the function registry.
3. The input object must match the schema for the function.
4. Occasionally you will want to show an example of a function call purely for explanatory purposes with no intention of invoking the function.
   In this case, use a regular \'json\' code fence instead of a \`function\` code fence.

{{> function_registry functions}}
`);
