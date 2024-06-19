// Path: packages/ingester/src/ingester.ts

import { MementoDb, type DocAndSummaryResult } from '@memento-ai/memento-db'
import { DOC, DSUM, createMem } from '@memento-ai/types'
import { gitListFilesFor, gitListRepositoryFiles, gitRepoRootForDir } from '@memento-ai/utils'
import debug from 'debug'
import fs from 'fs'
import path from 'path'
import { sql } from 'slonik'
import { z } from 'zod'
import { summarizeAndStoreDocuments, type Summarizer } from './summarizeDocument'

const dlog = debug('ingester')

export const SUPPORTED_EXTENSIONS = ['.ts', '.sql', '.md']

const DocumentIdTuple = z.object({
    id: z.string(),
    memid: z.string(),
    summaryid: z.string(),
    tokens: z.number(),
})

export async function ingestFile(
    db: MementoDb,
    filePath: string,
    summarizer?: Summarizer
): Promise<DocAndSummaryResult> {
    summarizer = summarizer ?? (await import('./summarizeDocument')).createMockSummarizer()
    const content = await fs.promises.readFile(filePath, 'utf-8')
    const source = filePath

    const mem = await createMem(content)

    let result: DocAndSummaryResult | undefined = undefined
    await db.pool.connect(async (conn) => {
        const row = await conn.maybeOne(
            sql.type(
                DocumentIdTuple
            )`SELECT id, summaryid, memid, tokens FROM memento WHERE source = ${source} AND kind = ${DOC};`
        )
        if (row) {
            const { id, memid, summaryid, tokens } = row
            if (memid === mem.id) {
                dlog(`Document ${source} with ${tokens} tokens unchanged since previous ingestas id=${id}`)
                result = { docid: id, summaryid }
            } else {
                dlog(`Document ${source} already ingested as id=${id}, deleting and re-ingesting.`)
                await conn.query(sql.unsafe`DELETE FROM meta WHERE id=${id} OR docid=${id};`)
            }
        }
    })

    if (result) {
        return result
    }

    dlog(`Ingesting file: ${source} with length: ${content.length}`)
    result = await summarizeAndStoreDocuments({ db, source, content, summarizer })
    dlog(`Summarized document ${result.docid} with summary ${result.summaryid}`)
    return result
}

export type IngestDirectoryArgs = {
    db: MementoDb
    dirPath: string
    summarizer?: Summarizer
    log?: boolean
}

export async function dropAbandonedFiles(db: MementoDb) {
    const existingPaths = new Set(await gitListRepositoryFiles())
    const ingestedPaths = new Set(await getIngestedFiles(db))
    const toDelete = [...ingestedPaths].filter((path) => !existingPaths.has(path))
    dlog(`Found ${toDelete.length} files to delete.`)
    for await (const path of toDelete) {
        dlog(`Deleting document for ${path} from the database since it no longer exists on the file system.`)
        await db.pool.connect(async (conn) => {
            await conn.query(sql.unsafe`DELETE FROM meta WHERE source = ${path};`)
        })
    }
}

export async function ingestDirectory({ db, dirPath, summarizer, log }: IngestDirectoryArgs): Promise<void> {
    log = log ?? false
    if (log) debug.enable('ingester')

    const root = await gitRepoRootForDir(dirPath)
    dlog(`Ingesting directory: ${dirPath}`)
    await dropAbandonedFiles(db)

    summarizer = summarizer ?? (await import('./summarizeDocument')).createMockSummarizer()

    // gitListFiles only returns files, not directories, but that's exactly what we want
    const existingPaths = new Set(await gitListFilesFor(dirPath))
    for (const relPath of existingPaths) {
        const fullPath = path.join(dirPath, relPath)
        const projectRelativePath = path.relative(root, fullPath)
        if (SUPPORTED_EXTENSIONS.includes(path.extname(projectRelativePath))) {
            await ingestFile(db, projectRelativePath, summarizer)
        }
    }
}

export async function dropIngestedFiles(db: MementoDb) {
    await db.pool.connect(async (conn) => {
        await conn.query(sql.unsafe`DELETE FROM meta WHERE kind = ${DOC} OR kind = ${DSUM};`)
    })
    dlog('Deleted all ingested files.')
}

export async function getIngestedFiles(db: MementoDb): Promise<string[]> {
    const Source = z.object({ source: z.string() })
    return await db.pool.connect(async (conn) => {
        const result = await conn.query(sql.type(Source)`SELECT source FROM meta WHERE kind = ${DOC};`)
        dlog(result)
        return result.rows.map((row: z.infer<typeof Source>) => row.source)
    })
}
