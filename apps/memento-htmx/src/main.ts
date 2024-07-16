// Path: apps/memento-htmx/src/main.ts

import { html } from '@elysiajs/html'
import { staticPlugin } from '@elysiajs/static'
import { Elysia } from 'elysia'

import { loadAggregateConfig } from '@memento-ai/config'
import { createMementoSystem } from '@memento-ai/memento-agent'

import { Writable } from 'node:stream'

type WsMessage = {
    type: 'content' | 'start' | 'end'
    content?: string
}

const configPath = process.env['MEMENTO_CONFIG_TOML']
if (!configPath) {
    throw new Error('MEMENTO_CONFIG_TOML environment variable is not set')
}

const configData = await loadAggregateConfig(configPath)
const system = await createMementoSystem(configData)

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
    .ws('/ws', {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        open(_ws) {
            console.log('WebSocket connection opened')
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        close(_ws) {
            console.log('WebSocket connection closed')
        },

        async message(ws, message) {
            // console.log('Received message:', message)

            function sendWsMessage(msg: WsMessage) {
                // console.log('Sending message:', msg)
                ws.send(JSON.stringify(msg))
            }

            let parsed
            if (typeof message === 'string') {
                try {
                    parsed = JSON.parse(message)
                } catch (error) {
                    console.error('Error parsing message string:', error)
                }
            } else if (typeof message === 'object') {
                parsed = message
            } else {
                console.error('Received unexpected message type:', typeof message)
                return
            }

            // console.log('Parsed message:', parsed)
            if (parsed && parsed.type === 'message' && typeof parsed.content === 'string') {
                // console.log('Processing message:', parsed.content)

                sendWsMessage({ type: 'start' })

                // console.log('Created writable stream, calling mementoAgent.run()')

                const writableStream = new Writable({
                    write(chunk, _encoding, callback) {
                        const chunkString = chunk instanceof Buffer ? chunk.toString() : chunk
                        // console.log('Memento agent produced chunk:', chunkString)
                        sendWsMessage({ type: 'content', content: chunkString })
                        callback()
                    },
                })

                await system.mementoAgent.run({
                    content: parsed.content,
                    stream: writableStream,
                })
                // console.log('Memento agent finished processing message')
                sendWsMessage({ type: 'end' })
            } else {
                console.error('Invalid message format:', parsed)
                sendWsMessage({ type: 'content', content: 'Error: Invalid message format' })
                sendWsMessage({ type: 'end' })
            }
        },
    })
    .get('/api/content-chunks', () => {
        // This is where you'd fetch the actual content chunks from your database
        const chunks = [
            { id: 1, content: 'Content chunk 1', type: 'detail' },
            { id: 2, content: 'Summary of exchange 2', type: 'summary' },
            { id: 3, content: 'Retrieved content 3', type: 'retrieval' },
        ]

        // Return HTML for the content chunks
        return `
      <ul>
        ${chunks
            .map(
                (chunk) => `
          <li class="chunk ${chunk.type}">
            <span class="chunk-content">${chunk.content}</span>
            <button class="expand-btn" hx-get="/api/chunk-detail/${chunk.id}" hx-target="next .chunk-detail">Expand</button>
            <div class="chunk-detail"></div>
          </li>
        `,
            )
            .join('')}
      </ul>
    `
    })
    .get('/api/chunk-detail/:id', ({ params: { id } }) => {
        // Fetch detailed content for a specific chunk
        return `<p>Detailed content for chunk ${id}</p>`
    })
    .listen(53530)

console.log(`Memento is running at http://${app.server?.hostname}:${app.server?.port}`)
