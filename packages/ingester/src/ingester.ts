// File: src/lib/ingester.ts

import debug from 'debug';
import fs from 'fs';
import path from 'path';
import { MementoDb, type DocAndSummaryResult } from '@memento-ai/memento-db';
import { DOC, DSUM } from '@memento-ai/types'
import { summarizeAndStoreDocuments, type Summarizer } from './summarizeDocument';
import { sql } from 'slonik';

const dlog = debug("ingester");

export const SUPPORTED_EXTENSIONS = ['.ts', '.sql'];

export async function ingestFile(db: MementoDb, filePath: string, summarizer?: Summarizer) : Promise<DocAndSummaryResult> {
    summarizer = summarizer ?? (await import('./summarizeDocument')).createMockSummarizer();
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const source = filePath;
    dlog(`Ingesting file: ${source} with length: ${content.length}`)
    const result: DocAndSummaryResult = await summarizeAndStoreDocuments({db, source, content, summarizer});
    dlog(`Summarized document ${result.docId} with summary ${result.summaryId}`)
    return result;
}

export async function ingestDirectory(db: MementoDb, dirPath: string, summarizer?: Summarizer) : Promise<void> {
    summarizer = summarizer ?? (await import('./summarizeDocument')).createMockSummarizer();
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            await ingestDirectory(db, fullPath, summarizer);
        } else if (entry.isFile() && SUPPORTED_EXTENSIONS.includes(path.extname(entry.name))) {
            await ingestFile(db, fullPath, summarizer);
        }
    }
}

export async function dropIngestedFiles(db: MementoDb) {
    await db.pool.connect(async (conn) => {
        await conn.query(sql.unsafe`DELETE FROM meta WHERE kind = ${DOC} OR kind = ${DSUM};`)
    });
    dlog('Deleted all ingested files.');
}

export async function getIngestedFiles(db: MementoDb) : Promise<string[]> {
    return await db.pool.connect(async (conn) => {
        const result = await conn.query(sql.unsafe`SELECT source FROM meta WHERE kind = ${DOC};`)
        dlog(result.rows)
        return result.rows.map((row: any) => row.source);
    });
}
