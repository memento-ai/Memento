import * as chatModule from '@memento-ai/chat';
import { type ChatSession } from "@memento-ai/chat" ;
import { USER, type Message, type Role } from "@memento-ai/types";
import type { Context, MementoDb, SimilarityResult } from "@memento-ai/memento-db";
import debug from "debug";
import { z } from 'zod';
import { generateFunctionDescription } from "@memento-ai/function-calling";
import { registry } from "@memento-ai/function-calling";
import { extractFunctionCalls, invokeFunctions, type FunctionCallRequest, type FunctionCallResult, functionCallResultAsString } from "@memento-ai/function-calling";
import c from 'ansi-colors';
import { getDatabaseSchema, getWhereClauseExamples } from "@memento-ai/postgres-db";
import { Writable } from "node:stream";

const dlog = debug("mementoChat");

export const NewMessageToAssistantArgs = z.object({
    content: z.string(),
    tokenLimit: z.number().default(1000),
    retrieveLimit: z.number().default(20),
});
export type NewMessageToAssistantArgs = z.TypeOf<typeof NewMessageToAssistantArgs>;

export function firstUserMessageContent(databaseSchema: string, whereClauseExamples: string) : string {
return `
These following are the currently registered functions. Use then only when you have good reason to believe they will be helpful
to formulating a good response. Remember: you are capable of answering many questions without external content.
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

The Memento system will execute the specified function and provide the result back to you.
An improperly formatted function call request will likely not be executed and returned to the user as if it
was a normally generated reply.

Note that the database schema definitions are defined by the following SQL statements.
Only SQL queries that conform to these schemas are valid.

\`\`\`sql
${databaseSchema}
\`\`\`

The function \`executeReadOnlyQuery\` takes a WhereClause argument that is capable of expressing complex
conditions. Examples of valid WhereClause objects are avaiable in the directory packages/postgres-db/src/whereClauseExamples/,
but are provided here for convenience:

${whereClauseExamples}

You can examine the code for transforming the WhereClause object into a SQL fragment by inspecting
the source code at path packages/postgres-db/src/whereClause.ts.

`.trim()
}

export function firstAssistantMessageContent(selectedMems: SimilarityResult[]) : string {
return `
The following context from the knowledge base MAY be useful in formulating the response.

${JSON.stringify(selectedMems, null, 2)}

All of the information provided so far is to guide you responses in a helpful direction.
The goal is meaningful dialogue, not blind invocation of functions. Consider each response
carefully and use your own judgment. Additional conversation history, if present,
should help you to judge how best to respond to maintain a constructive dialogue.
`.trim()
}

export interface ChatArgs {
    messages: Message[];
    system: string[];
    outStream?: Writable;
}

export class MementoChat
{
    private session: ChatSession;
    private db: MementoDb;
    private databaseSchema: string;

    constructor(session: ChatSession, db: MementoDb)
    {
        this.session = session;
        this.db = db;
        this.databaseSchema = getDatabaseSchema();
    }

    // Given all prior messages, chat with the agent and return the agent's response
    async chat(args: ChatArgs): Promise<Message> {
        const { messages, system, outStream } = args;
        const message: Message = !!outStream
            ? await chatModule.chatStreaming({session: this.session, messages, system, outStream})
            : await chatModule.chat(this.session, messages, system);
        const { content, role } = message;
        dlog('chatStreaming result:', message);

        // Add the message to the conversation collection
        await this.db.addConversationMem({content, role});

        return message;
    }

    async newMessageToAssistant(args: NewMessageToAssistantArgs): Promise<Message> {
        const { content, tokenLimit, retrieveLimit } = args;

        const role : Role = USER;
        const newMessage = {content, role};

        // Perform similarity search to retrieve relevant mems
        const similarityResults: SimilarityResult[] = await this.db.searchMemsBySimilarity(content, retrieveLimit);

        const priorConveration: Message[] = await this.db.getConversation();

        await this.db.addConversationMem(newMessage);

        // Filter and truncate the results based on token limit
        const selectedMems = [];
        let totalTokens = 0;
        for (const mem of similarityResults) {
            selectedMems.push(mem);
            totalTokens += mem.tokens;
            if (totalTokens + mem.tokens > tokenLimit) {
                break;
            }
        }

        const whereClauseExamples = await getWhereClauseExamples();

        // Construct the initial messages with the selected mems
        const initialMessages: Message[] = [
            {
              role: 'user',
              content: firstUserMessageContent(this.databaseSchema, whereClauseExamples),
            },
            {
              role: 'assistant',
              content: firstAssistantMessageContent(selectedMems),
          },
        ];

        // console.log("InitialMessages:", initialMessages);

        const system: string[] = await this.db.getSystemPrompts();
        const messages: Message[] = [...initialMessages, ...priorConveration, newMessage];
        const assistantMessage = await this.chat({messages, system, outStream: this.session.outStream});

        // Check if the assistant's response contains a function call
        const functionCalls: FunctionCallRequest[] = Array.from(extractFunctionCalls(assistantMessage.content));
        dlog("Extracted function calls:", functionCalls);
        const context: Context = { readonlyPool: this.db.readonlyPool };
        const functionResults: FunctionCallResult[] = await invokeFunctions(functionCalls, context);
        dlog("Extracted function results:", functionResults);

        if (functionResults.length == 0)
        {
            // This is the normal case -- no function calls. We return immediately.
            return assistantMessage;
        }
        else
        {
            // There were function call requests. We have already executed them but now
            // need to send them back to the assisstant. We do that by composing a
            // message as if it were from the user, and recursively using `newMessageToAssistant`
            // to send that message. That should allow the assistant to decide to call
            // even more functions that will all be executed before we return to
            // the outer REPL loop and wait for the user's response.
            const functionResultContent = functionResults.map(result => {
                return `\'\'\'result\n${functionCallResultAsString(result)}\n\'\'\'`;
            }).join('\n');

            if (this.session.outStream)
            {
                const prompt = c.red("\nYou: ");
                this.session.outStream.write(prompt);
                this.session.outStream.write(functionResultContent);
                this.session.outStream.write(`${c.blue('\nAssistant: ')}`);
            }

            args.content = functionResultContent;
            const finalMessage: Message = await this.newMessageToAssistant(args);
            return finalMessage;
        }
    }
}
