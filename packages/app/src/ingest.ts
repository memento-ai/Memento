// Path: packages/app/src/ingest.ts
import { Command } from 'commander';
import { MementoDb } from '@memento-ai/memento-db';
import { delete_unreferenced_mems, executeFileQuery, wipeDatabase } from '@memento-ai/postgres-db';
import debug from 'debug';
import { ingestDirectory, createModelSummarizer, type Summarizer, SUPPORTED_EXTENSIONS, type ProviderAndModel } from '@memento-ai/ingester';

const dlog = debug("ingest");

const program = new Command();

program
    .version('0.0.1')
    .description(`A utility to ingest files into a MementoDb. Currently ingests only the file types used to implement Memento: ${SUPPORTED_EXTENSIONS.join(', ')}`)
    .option('-d, --database <dbname>', 'The name of the database to use')
    .option('-x, --clean-slate', 'Drop the named database and start over')
    .option('-p, --provider <provider>', 'The provider to use [anthropic, ollama, openai')
    .option('-m, --model <model>', 'The model to use for summarization')
    .option('-C, --cwd <dir>', 'Use the specified directory as the current working directory (default: .)')
    .option('-D, --directory <dir>', 'The directory from which to recursively ingest files (default: packages)');

program.parse(process.argv);

async function main() {
    const options = program.opts();

    const { provider, model, database, cleanSlate } = options;

    if (!provider) {
        console.error('You must specify an LLM provider');
        program.help();
    }

    if (!model) {
        console.error('You must specify a model supported by the provider');
        program.help();
    }

    if (!database) {
        console.error('You must provide a database');
        program.help();
    }

    if (options.cwd) {
        process.chdir(options.directory);
    }

    const args: ProviderAndModel = { provider, model };

    const summarizer_ : Summarizer = createModelSummarizer(args);

    if (cleanSlate) {
        await wipeDatabase(database);
    }

    const db: MementoDb = await MementoDb.create(database);

    await ingestDirectory(db, options.directory ?? 'packages', summarizer_);
    await delete_unreferenced_mems(db.pool);

    await db.close();
}

main().catch(console.error);
