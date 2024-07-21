// Path: apps/memento-htmx/src/routes/memento.ts

import { Elysia } from 'elysia'
import type { AppContext } from '../AppContext'

export const mementoRoutes = (context: AppContext) =>
    new Elysia({ name: 'mementoRoutes' }).get('/api/memento/:id', async ({ params }) => {
        const { id } = params
        const { system } = context.store

        try {
            const memento = await system.db.getMementoById(id)

            if (!memento) {
                return new Response('Memento not found', { status: 404 })
            }

            if (memento.kind !== 'xchg') {
                return new Response('Invalid memento type', { status: 400 })
            }

            return Response.json({
                id: memento.id,
                content: memento.content,
                created_at: memento.created_at,
            })
        } catch (error) {
            console.error('Error fetching memento:', error)
            return new Response('Internal Server Error', { status: 500 })
        }
    })
