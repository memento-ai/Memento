// Path: packages/memento-agent/src/dynamicPrompt.ts

import { generateFunctionDescription } from "@memento-ai/function-calling";
import { registry } from "@memento-ai/function-calling";
import type { SimilarityResult } from "@memento-ai/memento-db";
import type { Memento } from "@memento-ai/types";

// TODO: functionCallingInstructions can be computed just once and then reused


export function functionCallingInstructions(databaseSchema: string) : string {
    return `
These following are the currently registered functions. Use them only when you have good reason to believe that they will be helpful
for formulating a good response. Remember: you are capable of answering many questions without external content.
If you do choose to call a function and it doesn't return useful content, respond to the user's request/question
as best you are able.

${Object.values(registry)
    .map(config => generateFunctionDescription(config))
    .join('\n')}

To invoke a function output a code-fenced JSON object.
For example:
\`\`\`function
{
    "name": "<function_name>",
    "input": {
    // Input parameters for the function
    }
}
\`\`\`

Some functions such as \`updateSummaries\` and \`addSynopsis\` may be called asynchronously. When executed asynchronously, the function execution
happens after your reponse is returned to the user, while the user is composing their next message.

The Memento system will execute the specified function and provide the result back to you.
An improperly formatted function call request will likely not be executed and returned to the user as if it
was a normally generated reply.

NOTE CAREFULLY: When you invoke a function, you will not see the result until the *next* message exchange.
The most efficient approach is to provide just the function call in your response without any additional
commentary intended for the user. After your receive the function call result you can then compose a full reply to the user.

NOTE ALSO: Do not provide an example of a function call that you do not intend to be executed!!
If you want to show an example but not execute it, use a regular \`json\` code block instead of a \`function\` code block.

The database schema definitions are defined by the following SQL statements.
Only SQL queries that conform to these schemas are valid.

\`\`\`sql
${databaseSchema}
\`\`\`

The function queryMementoView can be used to execute any read-only SQL query on this schema.
You should prefer to use the memento view but you may also query the mem or meta tables directly.
`.trim()
}

export function additionalContext(csumMems: Memento[], synopses: string[], selectedMems: SimilarityResult[]) : string {
        if (selectedMems.length == 0 && synopses.length==0 && csumMems.length == 0) {
            return "";
        }
    return `
The following is additional context selected from the database that might be useful in formulating your response to the user's newest message.

${csumMems.length == 0 ? "" :
`Pinned conversation mems:
${JSON.stringify(csumMems, null, 2)}
`}

${synopses.length == 0 ? "" :
`Conversation synopses:
${JSON.stringify(synopses, null, 2)}
`}

${selectedMems.length == 0 ? "" :
`Selected mems from the database using similarity search:
${JSON.stringify(selectedMems, null, 2)}
`}

This is the end of the system prompt and additional context.
    `.trim()
}
