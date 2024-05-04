// Path: packages/ingester/src/ingester.ts

import debug from 'debug';
import fs from 'fs';
import path from 'path';
import { MementoDb, type DocAndSummaryResult } from '@memento-ai/memento-db';
import { DOC, DSUM, createMem } from '@memento-ai/types'
import { summarizeAndStoreDocuments, type Summarizer } from './summarizeDocument';
import { sql } from 'slonik';
import { z } from 'zod';

const dlog = debug("ingester");

export const SUPPORTED_EXTENSIONS = ['.ts', '.sql', '.md'];

const DocumentIdTuple = z.object({
  id: z.string(),
  memid: z.string(),
  summaryId: z.string(),
  tokens: z.number(),
});

export async function ingestFile(db: MementoDb, filePath: string, summarizer?: Summarizer) : Promise<DocAndSummaryResult> {
    summarizer = summarizer ?? (await import('./summarizeDocument')).createMockSummarizer();
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const source = filePath;

    const mem = await createMem(content);

    let result: DocAndSummaryResult | undefined = undefined;
    let skip: boolean = false;
    await db.pool.connect(async (conn) => {
        const row = await conn.maybeOne(sql.type(DocumentIdTuple)`SELECT id, summaryId, memid, tokens FROM memento WHERE source = ${source} AND kind = ${DOC};`);
        if (row) {
            const { id, memid, summaryId, tokens } = row;
            if (memid === mem.id) {
                console.log(`Document ${source} with ${tokens} tokens unchanged since previous ingestas id=${id}`);
                skip = true;
                result = { docId: id, summaryId }
            } else {
                dlog(`Document ${source} already ingested as id=${id}, deleting and re-ingesting.`);
                await conn.query(sql.unsafe`DELETE FROM meta WHERE id=${id} OR docId=${id};`)
            }
        }
    });

    if (result) {
      return result;
    }

    dlog(`Ingesting file: ${source} with length: ${content.length}`)
    result = await summarizeAndStoreDocuments({db, source, content, summarizer});
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
