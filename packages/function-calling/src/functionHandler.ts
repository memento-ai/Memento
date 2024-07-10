// Path: packages/function-calling/src/functionHandler.ts

import type { FunctionRegistry } from '@memento-ai/function-registry'
import type { Context } from '@memento-ai/memento-db'
import type { AssistantMessage, Message, MetaId, UserMessage } from '@memento-ai/types'
import { constructAssistantMessage, constructUserMessage } from '@memento-ai/types'
import { stripCommonIndent } from '@memento-ai/utils'
import type { Writable } from 'node:stream'
import type { ExtractFunctionCallsResult } from './extractFunctionCalls'
import type { InvokeFunctionsArgs } from './functionCalling'
import type { FunctionCallingAgent } from './functionCallingAgent'
import { invokeSyncAndAsyncFunctions } from './invokeSyncAndAsyncFunctions'

export type FunctionHandlerArgs = {
    agent: FunctionCallingAgent
    max_func_cycles: number
}

export type FunctionHandlerHandleArgs = {
    userMessage: UserMessage
    priorMessages: Message[]
    extracted: ExtractFunctionCallsResult
    stream?: Writable,
}

export type RecursiveSendArgs = FunctionHandlerHandleArgs & {
    funcMementoIds: MetaId[]
}

export type AssistantResponse = {
    assistantMessage: AssistantMessage
    extracted?: ExtractFunctionCallsResult
}

export type SendUserMessageArgs = {
    // The system prompt
    userMessage: UserMessage

    // All of the selected conversation history (user, assistant pairs)
    // and the user's most recent message for which the assistant is to respond
    priorMessages: Message[]

    // If provided, the LLM streamig result is copied to this Writable stream
    // The stream is closed when the assistant is done responding
    stream?: Writable
}

export type SendUserMessageAndExtractFunctionCallsArgs = SendUserMessageArgs

export type SendUserMessageAndExecuteFunctionsArgs = SendUserMessageAndExtractFunctionCallsArgs

export type SendUserMessageAndExecuteFunctionsResult = {
    thoughts: string[]
    funcMementoIds: MetaId[]
}

type SummarizedAssistantMessageArgs = {
    thinking: string
    newFuncIds: MetaId[]
}

export class FunctionHandler {
    private agent: FunctionCallingAgent
    private registry: FunctionRegistry
    private max_func_cycles: number
    asyncResults: Promise<MetaId[]>

    constructor(args: FunctionHandlerArgs) {
        const { agent } = args
        this.agent = agent
        this.registry = agent.Registry
        this.asyncResults = Promise.resolve([])
        this.max_func_cycles = args.max_func_cycles
    }

    async sendUserMessageAndExecuteFunctions(
        args: SendUserMessageAndExecuteFunctionsArgs
    ): Promise<SendUserMessageAndExecuteFunctionsResult> {
        const thoughts: string[] = []
        const funcMementoIds: MetaId[] = []

        let { userMessage } = args
        const { priorMessages, stream } = args

        // Use FunctionCallingAgent to send the user message and extract function call requests
        let extracted: ExtractFunctionCallsResult = await this.agent.sendUserMessageAndExtractFunctionCalls(args)

        const context: Context = {
            readonlyPool: this.agent.db.readonlyPool,
            pool: this.agent.db.pool,
        }

        let newFuncIds: MetaId[] = []
        let cycles = 0
        while (extracted.hasCalls) {
            thoughts.push(extracted.thinking)
            ++cycles
            if (cycles >= this.max_func_cycles) {
                thoughts.push('ERROR: Reached maximum number of cycles in sendUserMessageAndExecuteFunctions.')
                return { thoughts, funcMementoIds }
            }
            const invokeArgs: InvokeFunctionsArgs = {
                extracted,
                context,
                registry: this.registry,
            }
            const invokeResults = await invokeSyncAndAsyncFunctions(invokeArgs)
            newFuncIds = invokeResults.funcMementoIds
            this.asyncResults = this.asyncResults.then(async (oldAsyncResults) => {
                const newAsyncResults = await invokeResults.newAsyncResultsP
                return [...oldAsyncResults, ...newAsyncResults]
            })
            funcMementoIds.push(...newFuncIds)

            priorMessages.push(userMessage)
            priorMessages.push(
                this.summarizedAssistantMessage({
                    newFuncIds,
                    thinking: extracted.thinking,
                })
            )

            userMessage = this.onBehalfOfUserMessage(funcMementoIds)
            extracted = await this.agent.sendUserMessageAndExtractFunctionCalls({
                userMessage,
                priorMessages,
                stream,
            })
        }

        thoughts.push(extracted.thinking)
        return { thoughts, funcMementoIds }
    }

    private summarizedAssistantMessage({ newFuncIds, thinking }: SummarizedAssistantMessageArgs): AssistantMessage {
        const content = stripCommonIndent(`
            <thinking>
            ${thinking}
            </thinking>
            <invoked>
            ${newFuncIds.map((m) => `<func>${m}</func>`).join('\n')}
            </invoked>
            `)
        return constructAssistantMessage(content)
    }

    private onBehalfOfUserMessage(funcMementoIds: MetaId[]): UserMessage {
        const pl = funcMementoIds.length === 1 ? '' : 's'
        const list = funcMementoIds.join(', ')
        const message = stripCommonIndent(`
            <system>
            Refer to the new 'func' memento${pl} [ ${list} ] for the newly generated function result${pl}.
            </system>
        `)
        return constructUserMessage(message)
    }
}
