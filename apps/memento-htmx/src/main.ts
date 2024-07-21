// Path: apps/memento-htmx/src/main.ts

import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'
import { Elysia } from 'elysia'

import { loadAggregateConfig } from '@memento-ai/config'
import { createMementoSystem } from '@memento-ai/memento-agent'

import type { AppContext } from './AppContext'
import { contextMementosRoutes } from './routes/context-mementos'
import { mementoRoutes } from './routes/memento'
import { recentSynopsesRoutes } from './routes/recent-synopses'
import { wsRoutes } from './routes/ws'

const configPath = process.env['MEMENTO_CONFIG_TOML']
if (!configPath) {
    throw new Error('MEMENTO_CONFIG_TOML environment variable is not set')
}

const configData = await loadAggregateConfig(configPath)
const system = await createMementoSystem(configData)

const context: AppContext = {
    store: { system },
}

const app = new Elysia()
    .use(html())
    .use(
        staticPlugin({
            prefix: '/',
            assets: 'public',
            headers: {
                '*.js': 'application/javascript',
                '*.mjs': 'application/javascript',
            },
        }),
    )
    .derive(() => {
        return {
            store: {
                system,
            },
        }
    })
    .use(wsRoutes(context))
    .use(contextMementosRoutes(context))
    .use(recentSynopsesRoutes(context))
    .use(mementoRoutes(context))
    .listen(53530)

console.log(`Memento is running at http://${app.server?.hostname}:${app.server?.port}`)
