// Path: packages/memento-agent/src/dynamicPrompt.ts

import { generateFunctionDescription } from "@memento-ai/function-calling";
import { registry } from "@memento-ai/function-calling";
import type { SimilarityResult } from "@memento-ai/memento-db";
import type { Memento } from "@memento-ai/types";

// TODO: functionCallingInstructions can be computed just once and then reused


export function functionCallingInstructions(databaseSchema: string) : string {
    return `
${Object.values(registry)
    .map(config => generateFunctionDescription(config))
    .join('\n')}
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
