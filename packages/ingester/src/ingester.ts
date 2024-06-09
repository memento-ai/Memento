// Path: packages/ingester/src/ingester.ts

import debug from 'debug';
import fs from 'fs';
import path from 'path';
import { MementoDb, type DocAndSummaryResult } from '@memento-ai/memento-db';
import { DOC, DSUM, createMem } from '@memento-ai/types'
import { summarizeAndStoreDocuments, type Summarizer } from './summarizeDocument';
import { sql } from 'slonik';
import { z } from 'zod';
import { $ } from 'bun';

const dlog = debug("ingester");

export const SUPPORTED_EXTENSIONS = ['.ts', '.sql', '.md'];

const DocumentIdTuple = z.object({
  id: z.string(),
  memid: z.string(),
  summaryid: z.string(),
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
        const row = await conn.maybeOne(sql.type(DocumentIdTuple)`SELECT id, summaryid, memid, tokens FROM memento WHERE source = ${source} AND kind = ${DOC};`);
        if (row) {
            const { id, memid, summaryid, tokens } = row;
            if (memid === mem.id) {
                dlog(`Document ${source} with ${tokens} tokens unchanged since previous ingestas id=${id}`);
                skip = true;
                result = { docid: id, summaryid }
            } else {
                dlog(`Document ${source} already ingested as id=${id}, deleting and re-ingesting.`);
                await conn.query(sql.unsafe`DELETE FROM meta WHERE id=${id} OR docid=${id};`)
            }
        }
    });

    if (result) {
      return result;
    }

    dlog(`Ingesting file: ${source} with length: ${content.length}`)
    result = await summarizeAndStoreDocuments({db, source, content, summarizer});
    dlog(`Summarized document ${result.docid} with summary ${result.summaryid}`)
    return result;
}

export async function getExistingGitFiles(dirPath: string) : Promise<string[]> {
    dlog('getExistingGitFiles: dirPath:', dirPath);
    const { stdout, stderr, exitCode } = await $`git ls-files ${dirPath}`.nothrow();
    dlog({exitCode, stderr});
    if (exitCode || stderr.length) { throw new Error(`Error running git ls-files: ${stderr}`); }
    const paths = stdout.toString().split('\n').filter((path) => path.length > 0);
    return paths;
}

export type IngestDirectoryArgs = {
    db: MementoDb,
    dirPath: string,
    summarizer?: Summarizer,
    log?: boolean,
};

export async function dropAbandonedFiles(db: MementoDb, dirPath: string) {
    const existingPaths = new Set(await getExistingGitFiles(dirPath));
    const ingestedPaths = new Set(await getIngestedFiles(db));
    const toDelete = [...ingestedPaths].filter((path) => !existingPaths.has(path));
    dlog(`Found ${toDelete.length} files to delete.`);
    for await (const path of toDelete) {
        dlog(`Deleting document for ${path} from the database since it no longer exists on the file system.`);
        await db.pool.connect(async (conn) => {
            await conn.query(sql.unsafe`DELETE FROM meta WHERE source = ${path};`)
        });
    }
}

export async function ingestDirectory({db, dirPath, summarizer, log}: IngestDirectoryArgs) : Promise<void> {
    log = log ?? false;
    if (log) debug.enable('ingester');

    dlog(`Ingesting directory: ${dirPath}`);

    await dropAbandonedFiles(db, dirPath);

    summarizer = summarizer ?? (await import('./summarizeDocument')).createMockSummarizer();

    // git ls-files only returns files, not directories, but that's exactly what we want
    const existingPaths = new Set(await getExistingGitFiles(dirPath));
    for (const fullPath of existingPaths) {
        if (SUPPORTED_EXTENSIONS.includes(path.extname(fullPath))) {
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
