// File: src/app/ingester.ts
import { Command } from 'commander';
import { MementoDb } from '@memento-ai/memento-db';
import { wipeDatabase } from '@memento-ai/postgres-db';
import debug from 'debug';
import { dropIngestedFiles, getIngestedFiles, ingestDirectory, createMockSummarizer, createModelSummarizer, type Summarizer, SUPPORTED_EXTENSIONS } from '@memento-ai/ingester';

const dlog = debug("ingest");

const program = new Command();

program
    .version('0.0.1')
    .description(`A utility to ingest files into a MementoDb. Currently ingests only the file types used to implement Memento: ${SUPPORTED_EXTENSIONS.join(', ')}`)
    .option('-d, --database <dbname>', 'The name of the database to use')
    .option('-x, --clean-slate', 'Drop the named database and start over')
    .option('-m, --model <model>', 'The model to use for summarization (haiku|sonnet|opus) (default: haiku)')
    .option('-C, --cwd <dir>', 'Use the specified directory as the current working directory (default: .)')
    .option('-D, --directory <dir>', 'The directory from which to recursively ingest files (default: packages)');

program.parse(process.argv);

async function main() {
    const options = program.opts();
    if (!options.database) {
        console.error('You must provide a database name');
        program.help();
    }

    const dbname = options.database;

    if (options.cleanSlate) {
        await wipeDatabase(dbname);
    }

    if (options.cwd) {
        process.chdir(options.directory);
    }

    let { model } = options;

    const summarizer_ : Summarizer = createModelSummarizer(model);

    const db: MementoDb = await MementoDb.create(dbname);

    const before = await getIngestedFiles(db);
    dlog(`Files ingested before: ${before.length}`);
    await dropIngestedFiles(db);
    const check = await getIngestedFiles(db);
    dlog(`Files ingested after drop: ${check.length}`);
    await ingestDirectory(db, options.directory ?? 'packages', summarizer_);
    const after = await getIngestedFiles(db);
    dlog(`Files ingested after: ${after.length}`);
    dlog('Ingestion completed.');

    await db.close();
}

main().catch(console.error);
