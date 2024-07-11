// Path: packages/memento-agent/src/prompt-partials/func_mementos.ts

import { FunctionCallMemento } from '@memento-ai/types'
import { stripCommonIndent } from '@memento-ai/utils'
import Handlebars from 'handlebars'
import type { z } from 'zod'

export const PartialFuncMemento = FunctionCallMemento.pick({
    id: true,
    docid: true,
    created_at: true,
    source: true,
    content: true,
}).required({ source: true })

export type PartialFuncMemento = z.infer<typeof PartialFuncMemento>

export type FuncMemementosTemplateArgs = {
    funcMems: PartialFuncMemento[]
}

const funcMementosText = stripCommonIndent(`
    <funcMems>
    <instructions>
    'func' mementos are a record of the function calls you have made in the recent past.
    They are stored in the database and presented here for your reference in composing your response.
    These function call results have a limited useful lifetime. Only calls made by conversational
    exchanges in the Conversation Snapshot will appear here. As conversation exchanges age out
    of the snapshot, so will their corresponding 'func' mementos.

    Important:
    1. These mementos represent completed function calls. Their results are immediately available for your use.
    2. For most functions, always make a new call rather than relying on past results, as the underlying data may have changed.
    3. For file operations (reading or writing source files), always make a new call. File contents can change independently of the agent's actions.
    4. Use these mementos primarily for context and understanding previous actions, not as a substitute for new function calls.
    5. Do not confuse these completed calls with new function calls you might make, which will not return results immediately.
    </instructions>
    {{#each funcMems}}
    <func id="{{id}}" name="{{source}} xchg={{docid}}">
    {{{content}}}
    </func>
    {{/each}}
    </funcMems>
`)

export const func_mementos = Handlebars.compile<FuncMemementosTemplateArgs>(funcMementosText)
