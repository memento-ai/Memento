// Path: packages/function-calling/src/functionCallingAgent.ts

import type { AgentArgs } from '@memento-ai/agent'
import { Agent } from '@memento-ai/agent'
import type { SendMessageArgs } from '@memento-ai/conversation'
import type { FunctionRegistry } from '@memento-ai/function-registry'
import type { MementoDb } from '@memento-ai/memento-db'
import type { AssistantMessage, Message, MetaId, UserMessage } from '@memento-ai/types'
import { USER } from '@memento-ai/types'
import { createTemporaryWritable } from '@memento-ai/utils'
import { extractFunctionCalls, type ExtractFunctionCallsResult } from './extractFunctionCalls'
import type { FunctionCallResult } from './functionCallingTypes'
import type { SendUserMessageArgs } from './functionHandler'

export type FunctionCallingAgentArgs = AgentArgs & {
    db: MementoDb
    registry: FunctionRegistry
}

export type SendUserAndExecuteFunctionsResult = {
    funcIds: MetaId[]
    thoughts: string[]
    asyncResultsP: Promise<FunctionCallResult[]>
}

export abstract class FunctionCallingAgent extends Agent {
    db: MementoDb
    protected registry: FunctionRegistry
    lastUserMessage: UserMessage

    constructor(args: FunctionCallingAgentArgs) {
        super(args)
        this.db = args.db
        this.registry = args.registry
        this.lastUserMessage = { content: '', role: USER }
    }

    async forward(args: SendMessageArgs): Promise<AssistantMessage> {
        return super.forward(args)
    }

    // Send a user message and extract (but do not execute) any function calls.
    async sendUserMessageAndExtractFunctionCalls({
        userMessage,
        priorMessages,
        stream,
    }: SendUserMessageArgs): Promise<ExtractFunctionCallsResult> {
        const prompt = await this.generatePrompt()
        const messages: Message[] = [...priorMessages, userMessage]
        const forwardArgs: SendMessageArgs = {
            prompt,
            messages,
            stream: !stream ? undefined : createTemporaryWritable(stream),
        }

        const assistantMessage: AssistantMessage = await this.forward(forwardArgs)
        const extracted: ExtractFunctionCallsResult = extractFunctionCalls(assistantMessage.content)
        return extracted
    }

    get Registry(): FunctionRegistry {
        return this.registry
    }
}
