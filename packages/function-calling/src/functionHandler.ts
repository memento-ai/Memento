// Path: packages/function-calling/src/functionHandler.ts

import type { FunctionRegistry } from '@memento-ai/function-registry'
import type { Context } from '@memento-ai/memento-db'
import type { AssistantMessage, Message, UserMessage } from '@memento-ai/types'
import { constructAssistantMessage, constructUserMessage } from '@memento-ai/types'
import { createTemporaryWritable } from '@memento-ai/utils'
import c from 'ansi-colors'
import debug from 'debug'
import type { Writable } from 'node:stream'
import type { InvokeFunctionsArgs, InvokeFunctionsResults } from './functionCalling'
import type { FunctionCallingAgent } from './functionCallingAgent'
import type { FunctionCallResult } from './functionCallingTypes'
import { invokeSyncAndAsyncFunctions } from './invokeSyncAndAsyncFunctions'

const dlog = debug('functionHandler')

function logMessages(prefix: string, messages: Message[]) {
    if (dlog.enabled) {
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i]
            const { role, content } = message
            const cont = content.slice(0, 30).replaceAll('\n', '\\n')
            dlog(`${prefix}: At index ${i}: ${role}: ${cont}`)
        }
    }
}

export type FunctionHandlerArgs = {
    agent: FunctionCallingAgent
}

export type FunctionHandlerHandleArgs = {
    userMessage: UserMessage
    priorMessages: Message[]
    stream?: Writable
}

export class FunctionHandler {
    private agent: FunctionCallingAgent
    private registry: FunctionRegistry
    asyncResults: Promise<FunctionCallResult[]>
    cycleCount: number

    constructor(args: FunctionHandlerArgs) {
        const { agent } = args
        this.agent = agent
        this.registry = agent.Registry
        this.asyncResults = Promise.resolve([])
        this.cycleCount = 0
    }

    async handle(args: FunctionHandlerHandleArgs): Promise<AssistantMessage> {
        this.cycleCount = 0
        return await this.recursiveSend(args)
    }

    // We want this method to have the elegant signature of sending a UserMessage and receiving an AssistantMessage
    // That means we have to construct the SendMessageArgs within this method.
    async recursiveSend({ userMessage, priorMessages, stream }: FunctionHandlerHandleArgs): Promise<AssistantMessage> {
        this.cycleCount++
        this.agent.checkForFunctionResults(userMessage)

        logMessages('Prior', priorMessages)
        logMessages('new user', [userMessage])

        // --- Send the message to the assistant here ---
        const prompt = await this.agent.generatePrompt()
        const messages: Message[] = [...priorMessages, userMessage]
        let assistantMessage: AssistantMessage = await this.agent.forward({
            prompt,
            messages,
            stream: !stream ? undefined : createTemporaryWritable(stream),
        })

        // Check if the assistant's response contains a function call
        const context: Context = this.agent.db.context()
        const invokeFunctionsArgs: InvokeFunctionsArgs = {
            assistantMessage,
            context,
            registry: this.registry,
            asyncResultsP: this.asyncResults,
            cycleCount: this.cycleCount,
        }
        const { functionResultContent, newAsyncResultsP }: InvokeFunctionsResults = await invokeSyncAndAsyncFunctions(
            invokeFunctionsArgs
        )
        this.asyncResults = newAsyncResultsP

        if (functionResultContent !== '') {
            if (stream) {
                const prompt = c.red('\nYou: ')
                stream.write(prompt)
                stream.write(functionResultContent)
                stream.write(`${c.blue('\nAssistant: ')}`)
            }

            if (functionResultContent.includes('FunctionCallLimitError')) {
                assistantMessage = constructAssistantMessage(functionResultContent)
            } else {
                const content = functionResultContent
                userMessage = constructUserMessage(content)
                assistantMessage = await this.recursiveSend({
                    userMessage,
                    priorMessages: [...priorMessages, userMessage, assistantMessage],
                    stream,
                })
            }
        }

        logMessages('new assistant response', [assistantMessage])
        return assistantMessage
    }
}
