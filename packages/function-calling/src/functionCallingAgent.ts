// Path: packages/function-calling/src/functionCallingAgent.ts

import { Agent } from "@memento-ai/agent";
import { FUNCTION_RESULT_HEADER } from "./functionCallingTypes";
import { USER } from "@memento-ai/types";
import type { AgentArgs } from "@memento-ai/agent";
import type { FunctionRegistry } from "./functionRegistry";
import type { UserMessage } from "@memento-ai/types";
import type { MementoDb } from "@memento-ai/memento-db";

export type FunctionCallingAgentArgs = AgentArgs & {
    db: MementoDb;
    registry: FunctionRegistry;
}

export abstract class FunctionCallingAgent extends Agent {
    db: MementoDb;
    protected registry: FunctionRegistry;
    lastUserMessage: UserMessage;

    constructor(args: FunctionCallingAgentArgs) {
        super(args);
        this.db = args.db;
        this.registry = args.registry;
        this.lastUserMessage = { content: "", role: USER };
    }

    checkForFunctionResults(userMessage: UserMessage): void {
        if (!userMessage.content.startsWith(FUNCTION_RESULT_HEADER)) {
            this.lastUserMessage = userMessage;
        }
    }

    get Registry(): FunctionRegistry
    {
        return this.registry;
    }
}
