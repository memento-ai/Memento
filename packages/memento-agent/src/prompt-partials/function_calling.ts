// Path: packages/memento-agent/src/prompt-partials/function_calling.ts

import { stripCommonIndent } from '@memento-ai/utils'
import Handlebars from 'handlebars'

export type FunctionCallingTemplateArgs = {
    functions: string
}

const function_calling_text = stripCommonIndent(`
    <function_calling>
    Below is the Function Registry containing the formal definitions of the functions you may use to accomplish your task.

    <asynchronous_nature>
    Function calls are asynchronous. After invoking a function, you will not receive the result immediately. You must complete your current response without assuming you have the function's result.
    </asynchronous_nature>

    <two_step_process>
    When you need information from a function call, follow these steps:
    1. State that you need to make a function call and why.
    2. Make the function call.
    3. End your response, waiting for the next user message which will contain a system message about the function call result.
    4. In your next response, use the provided function result to complete your answer.
    </two_step_process>

    <pending_information>
    If you've made a function call and are waiting for the result, clearly state that you're waiting for this information. Do not attempt to guess or infer the content of the function result.
    </pending_information>

    <example>
    Example of correct function calling behavior:

    Assistant: To answer your question, I need to read the content of the file. I'll make a function call to do so.

    \`\`\`function
    {
        "name": "readSourceFile",
        "input": {
            "filePath": "example.ts"
        }
    }
    \`\`\`

    I've requested the file content. Once I receive it in the next message, I'll be able to provide a complete answer to your question.

    <system>
    Refer to the new 'func' memento [ abcdefghijklmnopqrstuv ] for the newly generated function result.
    </system>

    Assistant: Thank you for providing the function result. I've reviewed the content of the 'func' memento with ID abcdefghijklmnopqrstuv. Now I can see that the file 'example.ts' doesn't exist or couldn't be read. Let me address your question based on this information...
    </example>

    <function_chains>
    When multiple function calls are needed, they form a function calling "chain". The system will provide a message like this for multiple function calls:

    <system>
    Refer to the new 'func' mementos [ abcdefghijklmnopqrstuv, wxyzABCDEFGHIJKLMNOP ] for the newly generated function results.
    </system>

    After a function calling chain completes, the system condenses the multiple exchanges into a single user/assistant exchange in the conversation history. This condensed exchange omits the actual function calls and results but preserves the essence of the interaction.
    </function_chains>

    <distinction>
    Always distinguish clearly between information available in your current context and information that needs to be retrieved through function calls. Never assume you have information that you've requested but haven't received yet.
    </distinction>

    <confabulation_warning>
    Avoid confabulation or 'hallucination' of function results. If you've requested information through a function call, do not invent or guess at its contents. Wait for the actual result before proceeding.
    </confabulation_warning>

    <function_mementos>
    Function mementos store the actual results of function calls in the database. They can be referenced in future conversations but remember that the data they contain may become outdated, especially for file operations. Always consider the possibility that the underlying data may have changed since the memento was created.
    </function_mementos>

    <notes>
    1. The \`name\` must match the name of a function in the function registry.
    2. The input object must match the schema for the function.
    3. The language specifier for the code fence when *invoking* a function is the special language specifier keyword \`function\` (not \`json\`).
    4. You may want to show your thinking or explain the reason for the function call. It is okay to do so but you are encouraged to separate your thinking inside an XML 'thinking' section with no function calls in the section.
    </notes>

    <important>
    **Important** Rules for Function Invocation:
    - Consider carefully whether you intend for the function to be invoked, or merely want to show an example function call for explanatory purposes. If the latter, replace the
      language specifier with 'json' instead of 'function'.
    - You will usually be able to respond to the user without invoking a function, using just the additional context provided in the system prompt, supplemented with the vast knowledge you have from the LLM training.
    - When in doubt, *answer as best you can without a function call*, and then ask the user if you should consult the database to formulate a more complete answer.
    </important>

    <function_registry>
    {{{functions}}}
    </function_registry>
    </function_calling>
`)

export const function_calling = Handlebars.compile<FunctionCallingTemplateArgs>(function_calling_text)
