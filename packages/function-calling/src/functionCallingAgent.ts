// Path: packages/function-calling/src/functionCallingAgent.ts

import type { AgentArgs } from '@memento-ai/agent'
import { Agent } from '@memento-ai/agent'
import type { SendMessageArgs } from '@memento-ai/conversation'
import type { FunctionRegistry } from '@memento-ai/function-registry'
import type { MementoDb } from '@memento-ai/memento-db'
import type { AssistantMessage, UserMessage } from '@memento-ai/types'
import { USER } from '@memento-ai/types'
import { FUNCTION_RESULT_HEADER } from './functionCallingTypes'

export type FunctionCallingAgentArgs = AgentArgs & {
    db: MementoDb
    registry: FunctionRegistry
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

    checkForFunctionResults(userMessage: UserMessage): void {
        if (!userMessage.content.startsWith(FUNCTION_RESULT_HEADER)) {
            this.lastUserMessage = userMessage
        }
    }

    get Registry(): FunctionRegistry {
        return this.registry
    }
}
