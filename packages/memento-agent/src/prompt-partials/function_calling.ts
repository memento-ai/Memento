import { stripCommonIndent } from "@memento-ai/utils";
import Handlebars from "handlebars";

export type FunctionCallingTemplateArgs = {
    functions: string,
};

const function_calling_text = stripCommonIndent(`
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
    {{this}}
`);

export const function_calling = Handlebars.compile<FunctionCallingTemplateArgs>(function_calling_text);
