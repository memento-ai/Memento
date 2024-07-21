// Path: apps/memento-htmx/src/routes/recent-synopses.ts

import type { MetaId } from '@memento-ai/types'
import { Elysia } from 'elysia'
import type { MementoDb, RecentSynopsis } from 'packages/memento-db'
import type { AppContext } from '../AppContext'

type Synopsis = {
    id: MetaId
    docid: MetaId
    content: string
    created_at: Date
}

export const recentSynopsesRoutes = (context: AppContext) =>
    new Elysia({ name: 'recentSynopsesRoutes' }).get('/api/recent-synopses', async ({ query }) => {
        const { format = 'json', limit = '30' } = query
        const { system } = context.store

        // Convert limit to number and ensure it's within a reasonable range
        const synopsisLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100)

        // Fetch recent synopses from the database
        const recentSynopses: RecentSynopsis[] = await fetchRecentSynopses(system.db, synopsisLimit)

        switch (format) {
            case 'html': {
                const html = renderSynopsesHtml(recentSynopses)
                return new Response(html, { headers: { 'Content-Type': 'text/html' } })
            }
            case 'json':
            default:
                return Response.json(recentSynopses)
        }
    })

async function fetchRecentSynopses(db: MementoDb, limit: number): Promise<RecentSynopsis[]> {
    return await db.getRecentSynopses({ limit })
}

function renderSynopsesHtml(synopses: Synopsis[]): string {
    return `
    <div class="historical-synopses">
      ${synopses
          .map(
              (synopsis) => `
        <div class="synopsis" data-synopsis-id="${synopsis.id}" data-exchange-id="${synopsis.docid}">
          <div class="synopsis-content">${escapeHtml(synopsis.content)}</div>
          <button class="expand-exchange">Expand</button>
        </div>
      `,
          )
          .join('')}
    </div>
  `
}

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}
