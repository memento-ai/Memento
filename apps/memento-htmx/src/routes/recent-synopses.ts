// Path: apps/memento-htmx/src/routes/recent-synopses.ts

import { Elysia } from 'elysia'
import type { MementoDb, RecentSynopsis } from 'packages/memento-db'
import type { AppContext } from '../AppContext'

export const recentSynopsesRoutes = (context: AppContext) =>
    new Elysia({ name: 'recentSynopsesRoutes' }).get('/api/recent-synopses', async ({ query }) => {
        const { format = 'json', limit = '30' } = query
        const { system } = context.store

        // Convert limit to number and ensure it's within a reasonable range
        const synopsisLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100)

        // Fetch recent synopses from the database
        const recentSynopses: RecentSynopsis[] = await fetchRecentSynopses(system.db, synopsisLimit)

        switch (format) {
            case 'json':
            default:
                return Response.json(recentSynopses)
        }
    })

async function fetchRecentSynopses(db: MementoDb, limit: number): Promise<RecentSynopsis[]> {
    return await db.getRecentSynopses({ limit })
}
