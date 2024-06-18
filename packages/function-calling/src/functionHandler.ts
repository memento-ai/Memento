// Path: packages/function-calling/src/functionHandler.ts

import type { Context } from '@memento-ai/memento-db'
import type { AssistantMessage, Message, UserMessage } from '@memento-ai/types'
import { constructAssistantMessage, constructUserMessage } from '@memento-ai/types'
import c from 'ansi-colors'
import debug from 'debug'
import { Writable } from 'node:stream'
import type { InvokeFunctionsArgs, InvokeFunctionsResults } from './functionCalling'
import type { FunctionCallingAgent } from './functionCallingAgent'
import type { FunctionCallResult } from './functionCallingTypes'
import type { FunctionRegistry } from './functionRegistry'
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
    outStream?: Writable
}

export class FunctionHandler {
    private agent: FunctionCallingAgent
    private registry: FunctionRegistry
    asyncResults: Promise<FunctionCallResult[]>
    outStream?: Writable
    cycleCount: number

    constructor(args: FunctionHandlerArgs) {
        const { agent } = args
        this.agent = agent
        this.registry = agent.Registry
        this.asyncResults = Promise.resolve([])
        this.outStream = args.outStream
        this.cycleCount = 0
    }

    async handle(userMessage: UserMessage, priorMessages: Message[]): Promise<AssistantMessage> {
        this.cycleCount = 0
        return await this.recursiveSend(userMessage, priorMessages)
    }

    // We want this method to have the elegant signature of sending a UserMessage and receiving an AssistantMessage
    // That means we have to construct the SendMessageArgs within this method.
    async recursiveSend(userMessage: UserMessage, priorMessages: Message[]): Promise<AssistantMessage> {
        this.cycleCount++
        this.agent.checkForFunctionResults(userMessage)

        logMessages('Prior', priorMessages)
        logMessages('new user', [userMessage])

        // --- Send the message to the assistant here ---
        const prompt = await this.agent.generatePrompt()
        const messages: Message[] = [...priorMessages, userMessage]
        let assistantMessage: AssistantMessage = await this.agent.forward({ prompt, messages })

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
            if (this.outStream) {
                const prompt = c.red('\nYou: ')
                this.outStream.write(prompt)
                this.outStream.write(functionResultContent)
                this.outStream.write(`${c.blue('\nAssistant: ')}`)
            }

            if (functionResultContent.includes('FunctionCallLimitError')) {
                assistantMessage = constructAssistantMessage(functionResultContent)
            } else {
                const content = functionResultContent
                userMessage = constructUserMessage(content)
                assistantMessage = await this.recursiveSend(userMessage, [
                    ...priorMessages,
                    userMessage,
                    assistantMessage,
                ])
            }
        }

        logMessages('new assistant response', [assistantMessage])
        return assistantMessage
    }
}
