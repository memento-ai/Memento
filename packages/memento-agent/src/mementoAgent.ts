// Path: packages/memento-agent/src/mementoAgent.ts

import {  type SendMessageArgs } from "@memento-ai/conversation";
import { Agent, type AgentArgs, type SendArgs } from "@memento-ai/agent";
import { awaitAsyncAgentActions, startAsyncAgentActions } from "./asyncAgentGlue";
import { getDatabaseSchema } from "@memento-ai/postgres-db";
import { invokeSyncAndAsyncFunctions, type InvokeFunctionsResults, FUNCTION_RESULT_HEADER, type InvokeFunctionsArgs } from "./invokeFunctions";
import { mementoPromptTemplate, type MementoPromptTemplateArgs } from "./mementoPromptTemplate";
import { registry } from "@memento-ai/function-calling";
import { retrieveContext } from "./retrieveContext";
import { type FunctionCallResult } from "@memento-ai/function-calling";
import { USER, type Message, type Role, type Memento } from "@memento-ai/types";
import { Writable } from "node:stream";
import c from 'ansi-colors';
import type { Context } from "@memento-ai/memento-db";
import type { ContinuityAgent } from "@memento-ai/continuity-agent";
import type { SynopsisAgent } from "@memento-ai/synopsis-agent";

export type MementoAgentArgs = AgentArgs & {
    outStream?: Writable;
    continuityAgent?: ContinuityAgent;
    synopsisAgent?: SynopsisAgent;
    max_message_pairs?: number;
    max_response_tokens?: number;
    max_csum_tokens?: number;
    max_similarity_tokens?: number;
    max_synopses_tokens?: number;
}

export class MementoAgent extends Agent
{
    databaseSchema: string;
    outStream?: Writable;
    continuityAgent?: ContinuityAgent;
    synopsisAgent?: SynopsisAgent;
    lastUserMessage: string;
    max_message_pairs: number;
    max_csum_tokens: number;
    max_similarity_tokens: number;
    max_synopses_tokens: number;
    asyncResults: Promise<FunctionCallResult[]>;
    continuityResponsePromise: Promise<string> | null = null;
    continuityResponseContent: string | null = null;

    constructor(args: MementoAgentArgs)
    {
        const { conversation, db, outStream, continuityAgent, synopsisAgent, max_message_pairs, max_csum_tokens, max_similarity_tokens, max_synopses_tokens } = args;
        super({ conversation, db, registry });
        this.databaseSchema = getDatabaseSchema();
        this.outStream = outStream;
        this.continuityAgent = continuityAgent;
        this.synopsisAgent = synopsisAgent;
        this.lastUserMessage = "";
        this.max_message_pairs = max_message_pairs?? 5;
        this.max_csum_tokens = max_csum_tokens ?? 1000;
        this.max_similarity_tokens = max_similarity_tokens ?? 2000;
        this.max_synopses_tokens = max_synopses_tokens ?? 2000;
        this.asyncResults = Promise.resolve([]);
        this.continuityResponsePromise = null;
        this.continuityResponseContent = null;
    }

    close(): Promise<void> {
        return this.DB.close();
    }

    // Given all prior messages, chat with the agent and return the agent's response
    async sendMessage({ prompt, messages }: SendMessageArgs): Promise<Message> {
        // messages must include the last user message
        const message = await this.conversation.sendMessage({ prompt, messages });
        const { content, role } = message;

        // Add the message to the conversation collection
        await this.DB.addConversationMem({content, role});
        return message;
    }

    async run({ content }: SendArgs) : Promise<Message> {
        if (!!this.continuityAgent && !!this.continuityResponsePromise) {
            this.continuityResponseContent = await awaitAsyncAgentActions({ continuityResponsePromise: this.continuityResponsePromise });
            this.continuityResponsePromise = null;
        }

        let assistantMessage: Message = await this.send({ content });

        const startAsyncAgentActionsArgs = {
            synopsisAgent: this.synopsisAgent,
            continuityAgent: this.continuityAgent,
            db: this.DB,
            max_message_pairs: this.max_message_pairs
        };
        this.continuityResponsePromise = startAsyncAgentActions(startAsyncAgentActionsArgs);

        return assistantMessage;
    }

    checkForFunctionResults(content: string): void {
        if (!content.startsWith(FUNCTION_RESULT_HEADER)) {
            this.lastUserMessage = content;
        }
    }

    async send({ content }: SendArgs): Promise<Message> {
        this.checkForFunctionResults(content);

        const role : Role = USER;
        const newMessage = {content, role};
        // Get the prior conversation before adding the new message
        const maxMessagePairs: number = 5;  // TODO: configure this from command line
        const priorConveration: Message[] = await this.DB.getConversation(maxMessagePairs);

        await this.DB.addConversationMem(newMessage);

        const tempateArgs: MementoPromptTemplateArgs = await retrieveContext(this);
        const prompt = mementoPromptTemplate(tempateArgs);

        const messages: Message[] = [...priorConveration, newMessage];

        // --- Send the message to the assistant here ---
        let assistantMessage: Message = await this.sendMessage({messages, prompt});

        // Check if the assistant's response contains a function call
        const context: Context = this.DB.context();
        const invokeFunctionsArgs: InvokeFunctionsArgs = {assistantMessage, context, registry: this.Registry, asyncResultsP: this.asyncResults};
        const {functionResultContent, newAsyncResultsP } : InvokeFunctionsResults = await invokeSyncAndAsyncFunctions(invokeFunctionsArgs)
        this.asyncResults = newAsyncResultsP;

        if (functionResultContent !== "")
        {
            if (this.outStream)
            {
                const prompt = c.red("\nYou: ");
                this.outStream.write(prompt);
                this.outStream.write(functionResultContent);
                this.outStream.write(`${c.blue('\nAssistant: ')}`);
            }

            content = functionResultContent;
            assistantMessage = await this.send({ content });
        }

        return assistantMessage;
    }
}
