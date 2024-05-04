// Path: packages/continuity-agent/src/continuityPromptTemplate.ts

import { stripCommonIndent } from "@memento-ai/utils";

export const continuityPromptTemplate = stripCommonIndent(`
    ## Instructions
    {{system}}

    ## Functions
    Below is the formal definition of the a function you must use to accomplish your task. You issue a request to the
    Memento system to execute a function by providing a JSON formatted FunctionCallRequest object with the
    function name and input parameters. The system will respond with a FunctionCallResult object containing
    the result of executing the function.

    Your response will not be seen by the user so you should not include any helpful commentary.
    If you decide that invoking the function is not neccesary at this time, you can simply respond with
    "No action required."

    If you do decide to invoke the function, the function call request JSON object is all that you should include
    in your response.

    {{functions}}

    NOTE: the FunctionCallRequest object must be placed in a code fence using the keyword \`function\` as the
    language specifier.

    This is a full example an updateSummaries request:

    \`\`\`function
    {
        "name": "updateSummaries",
        "input": {
            "updates": [
                {
                    "metaId": "test/summary",
                    "content": "This is the new content for the summary.",
                    "priority": 1,
                    "pinned": true
                }
            ]
        }
    }
    \`\`\`

    NOTE: There is no direct way to delete a csum mem. To remove a csum mem, you should unpin it and update the priority to 0.
    You will only see csum mems with priority > 0. The MementoAgent will only see pinned csum mems. The set of pinned csum mems
    that the MementoAgent sees may be a subset of all pinned csum mems selected by priority.

    ## Synopses
    {{#each synopses}}
    - {{this}}
    {{/each}}

    ## CSUM Mementos
    The following are a selection of the conversation summary mems in the database. The MementoAgent will only see pinned
    mems, but you can see both pinned and unpinned mems. You may unpin mems that are no longer relevant, or repin mementos
    after they have become relevant again.

    {{#each mementos}}
    - {
        metaid: "{{metaid}}"
        priority: {{priority}}
        pinned: {{pinned}}
        content: "{{content}}"
    }
    {{/each}}
`);
