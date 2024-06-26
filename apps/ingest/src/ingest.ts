// Path: apps/ingest/src/ingest.ts

import { ProviderNames, isProvider } from '@memento-ai/conversation'
import type { ProviderAndModel, Summarizer } from '@memento-ai/ingester'
import {
    SUPPORTED_EXTENSIONS,
    copyIngestedMementos,
    createModelSummarizer,
    dropAbandonedFiles,
    dropIngestedFiles,
    ingestDirectory,
} from '@memento-ai/ingester'
import { MementoDb } from '@memento-ai/memento-db'
import {
    connectDatabase,
    createMementoDb,
    databaseExists,
    delete_unreferenced_mems,
    wipeDatabase,
} from '@memento-ai/postgres-db'
import { DocumentMemento } from '@memento-ai/types'
import { gitRepoRoot } from '@memento-ai/utils'
import { Command } from 'commander'
import type { DatabasePool } from 'slonik'
import { sql } from 'slonik'

const program = new Command()

program
    .version('0.0.1')
    .description(
        `A utility to ingest files into a MementoDb. Currently ingests only the file types used to implement Memento: ${SUPPORTED_EXTENSIONS.join(
            ', '
        )}`
    )
    .option('-d, --database <dbname>', 'The name of the database to use')
    .option('-x, --clean-slate', 'Drop the named database and start over')
    .option('-p, --provider <provider>', 'The provider to use [anthropic, ollama, openai')
    .option('-m, --model <model>', 'The model to use for summarization')
    .option('-C, --cwd <dir>', 'Use the specified directory as the current working directory (default: .)')
    .option('-D, --directory <dir>', 'The directory from which to recursively ingest files (default: .)')

program.parse(process.argv)

type Options = {
    provider: string
    model: string
    database: string
    cleanSlate?: boolean
    cwd?: string
    directory?: string
}

const Documents = DocumentMemento.pick({
    id: true,
    tokens: true,
    source: true,
})

async function main() {
    const options: Options = program.opts() as Options

    const { provider, model, database } = options
    let { cleanSlate, directory } = options

    cleanSlate = cleanSlate ?? false
    const root = await gitRepoRoot()
    directory = directory ?? root
    console.info(`Ingesting files from ${directory}`)

    if (!provider) {
        console.error(`You must specify an LLM provider (${ProviderNames.join(', ')}`)
        program.help()
    }

    if (!isProvider(provider)) {
        console.error(`The provider ${provider} is not a known provider`)
        process.exit(1)
    }

    if (!model) {
        console.error('You must specify a model supported by the provider')
        program.help()
    }

    if (!database) {
        console.error('You must provide a database name')
        program.help()
    }

    if (options.cwd) {
        process.chdir(options.cwd)
    }

    const args: ProviderAndModel = { provider, model }

    const summarizer: Summarizer = createModelSummarizer(args)

    const template_db_name: string = `template_${provider}_${model}`.replaceAll(/\//g, '_')
    try {
        console.info(`Ensuring template database ${template_db_name} exists.`)
        let template_db: DatabasePool

        const template_db_exists = await databaseExists(template_db_name)
        if (!template_db_exists) {
            console.log(`Creating template database ${template_db_name}`)
            await createMementoDb(template_db_name)
        }

        try {
            console.info(`Testing connection to template database ${template_db_name}.`)
            template_db = await connectDatabase(template_db_name)
            template_db.end()
        } catch (e) {
            console.error(`Error making test connection to template database ${template_db_name}:`, e)
            process.exit(1)
        }
    } catch (e) {
        console.error(`Error creating template database ${template_db_name}:`, e)
        process.exit(1)
    }

    const db: MementoDb = await MementoDb.connect(template_db_name)
    const dirPath = directory

    console.info(
        `Ingesting files from ${dirPath} into template database ${template_db_name} then into database ${database}`
    )
    await ingestDirectory({ db, dirPath, summarizer, log: true })

    console.info(`Deleting unreferenced mementos from template database ${template_db_name}`)
    await delete_unreferenced_mems(db.pool)

    if (cleanSlate) {
        await wipeDatabase(database)
    }

    const target: MementoDb = await MementoDb.connect(database)
    await dropIngestedFiles(target)
    await copyIngestedMementos(db.pool, target.pool)
    await db.close()

    await dropAbandonedFiles(target)

    await delete_unreferenced_mems(target.pool)

    const result = await target.pool.query(
        sql.type(Documents)`SELECT id, source, tokens FROM memento WHERE kind = 'doc' ORDER BY tokens DESC LIMIT 10`
    )
    console.table(result.rows)

    await target.close()
}

main().catch(console.error)
