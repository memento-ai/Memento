// Path: packages/postgres-db/src/cleanUpLastUserMem.ts

import debug from 'debug'
import { sql, type DatabasePool } from 'slonik'

const dlog = debug('cleanUpLastUserMem')

export async function cleanUpLastUserMem(pool: DatabasePool) {
    // If the most recent conv mem is role: USER, then it is because the app crashed
    // before the assistant could respond. We should delete it.
    await pool.connect(async (conn) => {
        const lastUserMem = await conn.query(sql.unsafe`
            SELECT id, role, content
            FROM memento
            WHERE kind = 'conv'
            ORDER BY created_at DESC
            LIMIT 1
        `)
        if (lastUserMem.rows.length > 0 && lastUserMem.rows[0].role === 'user') {
            const { id, content } = lastUserMem.rows[0]
            console.warn('Whoops! Looks like we crashed before the assistant could respond. Cleaning up...')
            console.warn('Deleting user message:\n', content)
            // This will leave the mem in the database, but it will be orphaned, and can be garbage collected later.
            await conn.query(sql.unsafe`
                DELETE FROM meta
                WHERE id = ${id}
            `)
        } else {
            dlog('No user mem to clean up')
        }
    })
}
