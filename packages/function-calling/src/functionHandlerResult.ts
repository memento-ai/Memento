// Path: packages/function-calling/src/functionHandlerResult.ts

import { AssistantMessage, MetaId } from '@memento-ai/types'
import { z } from 'zod'

export const FunctionHandlerResult = z.object({
    assistantMessage: AssistantMessage,
    funcMementoIds: z.array(MetaId),
})

export type FunctionHandlerResult = z.infer<typeof FunctionHandlerResult>
