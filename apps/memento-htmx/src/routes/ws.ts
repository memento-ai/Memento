// Path: apps/memento-htmx/src/routes/ws.ts

import { Elysia } from 'elysia'
import { Writable } from 'node:stream'

import { type AppContext } from '../AppContext'

type WsMessage = {
    type: 'content' | 'start' | 'end'
    content?: string
}

export const wsRoutes = (context: AppContext) => {
    return new Elysia({ name: 'wsRoutes' }).ws('/ws', {
        open() {
            console.log('WebSocket connection opened')
        },
        close() {
            console.log('WebSocket connection closed')
        },

        async message(ws, message) {
            const { system } = context.store

            function sendWsMessage(msg: WsMessage) {
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

            if (parsed && parsed.type === 'message' && typeof parsed.content === 'string') {
                let startSent = false

                const writableStream = new Writable({
                    write(chunk, _encoding, callback) {
                        if (!startSent) {
                            sendWsMessage({ type: 'start' })
                            startSent = true
                        }
                        const chunkString = chunk instanceof Buffer ? chunk.toString() : chunk
                        sendWsMessage({ type: 'content', content: chunkString })
                        callback()
                    },
                })

                await system.mementoAgent.run({
                    content: parsed.content,
                    stream: writableStream,
                })
                sendWsMessage({ type: 'end' })
            } else {
                console.error('Invalid message format:', parsed)
                sendWsMessage({ type: 'content', content: 'Error: Invalid message format' })
                sendWsMessage({ type: 'end' })
            }
        },
    })
}
