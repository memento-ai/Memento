// Path: packages/memento-agent/src/mementoPromptTemplate.ts

import type { MementoSearchResult } from '@memento-ai/search'
import { MetaId } from '@memento-ai/types'
import { stripCommonIndent } from '@memento-ai/utils'
import Handlebars from 'handlebars'
import { additional_context } from './prompt-partials/additional_context'
import { core_system } from './prompt-partials/core_system'
import { PartialFuncMemento, func_mementos } from './prompt-partials/func_mementos'
import { function_calling } from './prompt-partials/function_calling'
import { pronouns } from './prompt-partials/pronouns'
import { resolutions } from './prompt-partials/resolutions'
import { sql_schema } from './prompt-partials/sql_schema'
import { synopses } from './prompt-partials/synopses'
import { terminology } from './prompt-partials/terminology'

export type MementoPromptTemplateArgs = {
    functions: string
    databaseSchema: string
    resolutions: string[]
    synMems: string[]
    funcMems: PartialFuncMemento[]
    dsumMems: MementoSearchResult[]
    docMems: MementoSearchResult[]
    xchgMems: MementoSearchResult[]
}

export type ContextMementosResult = {
    funcMems: MetaId[]
    dsumMems: MetaId[]
    docMems: MetaId[]
    xchgMems: MetaId[]
}

export const emptyPromptTemplateArgs: MementoPromptTemplateArgs = {
    functions: '',
    databaseSchema: '',
    resolutions: [],
    synMems: [],
    funcMems: [],
    dsumMems: [],
    docMems: [],
    xchgMems: [],
}

Handlebars.registerHelper('obj', function (context) {
    return Bun.inspect(context)
})

Handlebars.registerPartial('additional_context', additional_context)
Handlebars.registerPartial('core_system', core_system)
Handlebars.registerPartial('function_calling', function_calling)
Handlebars.registerPartial('func_mementos', func_mementos)
Handlebars.registerPartial('pronouns', pronouns)
Handlebars.registerPartial('resolutions', resolutions)
Handlebars.registerPartial('sql_schema', sql_schema)
Handlebars.registerPartial('synopses', synopses)
Handlebars.registerPartial('terminology', terminology)

const mementoPromptTemplateText = stripCommonIndent(`
    <system>
    {{> core_system }}

    {{> pronouns }}

    {{> terminology }}

    {{> function_calling functions=functions }}

    {{> sql_schema databaseSchema=databaseSchema }}

    {{> additional_context docMems=docMems dsumMems=dsumMems xchgMems=xchgMems }}

    {{> func_mementos funcMems=funcMems }}

    {{> synopses synMems=synMems}}

    {{> resolutions resolutions=resolutions}}
    </system>
`)

export const mementoPromptTemplate = Handlebars.compile<MementoPromptTemplateArgs>(mementoPromptTemplateText)
