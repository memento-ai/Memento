// Path: apps/memento-htmx/src/routes/context-mementos.ts

import type { MetaId } from '@memento-ai/types'
import { Elysia } from 'elysia'
import type { AppContext } from '../AppContext'

export type ContextMementosResult = {
    funcMems: MetaId[]
    dsumMems: MetaId[]
    docMems: MetaId[]
    xchgMems: MetaId[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const contextMementosRoutes = (_context: AppContext) => {
    return new Elysia({ name: 'context-mementos' }).get('/api/context-mementos', ({ store }: AppContext) => {
        const { system } = store
        const promptContext = system.mementoAgent.promptContext

        if (!promptContext) {
            return {
                error: 'Prompt context not available',
            }
        }

        const createList = (title: string, items: string[]) => `
            <h4>${title}</h4>
            <ul>
                ${items.map((id) => `<li>${id}</li>`).join('')}
            </ul>
        `

        const html = `
            <div id="context-mementos">
                <h3>Context Mementos</h3>
                ${createList(
                    'Functions',
                    promptContext.funcMems.map((mem) => mem.id),
                )}
                ${createList(
                    'Document Summaries',
                    promptContext.dsumMems.map((mem) => mem.id),
                )}
                ${createList(
                    'Documents',
                    promptContext.docMems.map((mem) => mem.id),
                )}
                ${createList(
                    'Exchanges',
                    promptContext.xchgMems.map((mem) => mem.id),
                )}
            </div>
        `

        return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
        })
    })
}
