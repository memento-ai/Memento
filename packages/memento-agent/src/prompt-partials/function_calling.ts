// Path: packages/memento-agent/src/prompt-partials/function_calling.ts

import { stripCommonIndent } from '@memento-ai/utils'
import Handlebars from 'handlebars'

export type FunctionCallingTemplateArgs = {
    functions: string
}

const function_calling_text = stripCommonIndent(`
    <function_calling>
    Below is the Function Registry containing the formal definitions of the a functions you may use to accomplish your task.

    When you want to invoke a function, you must return a properly formated JSON object in a markdown code fence.
    You will not see the result of the function call until the next message is delivered to you by the system.

    <example>
    Example Function Call

    \`\`\`function
    {
        "name": "gitListFiles",
        "input": {}
    }
    \`\`\`
    </example>

    <notes>:
    1. The \`name\` must match the name of a function in the function registry.
    2. The input object must match the schema for the function.
    3. The language specifier for the code fence when *invoking* a function is the special language
    specifier keyword \`function\` (not \`json\`).
    4. You may want to show your thinking or explain the reason for the function call. It is okay
    to do so but you are encouraged to separate your thinking inside an XML 'thinking' section
    with no function calls in the section.
    </notes>

    <important>
    **Important** Rules for Function Invocation:
    - **Consider carefully whether you intend for the function to be invoked, or merely want to
        show an example function call for explanatory purposes.
    - **You will usually be able to respond to the user without invoking a function, using just the
        additional context provided in the system prompt, supplemented with the vast knowledge you
        have from the LLM training.
        When in doubt, *answer as best you can without a function call*, and then ask the user
        if you should consult the database to formulate a more complete answer.**
    </important>

    <function_registry>
    {{{functions}}}
    </function_registry>
    </function_calling>
`)

export const function_calling = Handlebars.compile<FunctionCallingTemplateArgs>(function_calling_text)
