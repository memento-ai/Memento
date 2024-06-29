// Path: apps/update-readmes/src/main.ts

import type { Provider } from '@memento-ai/conversation'
import { AddPackageReadmeAgent, AddProjectReadmeAgent, type AddPackageReadmeAgentArgs } from '@memento-ai/readme-agents'
import { getMementoProjectRoot } from '@memento-ai/utils'
import { Command } from 'commander'
import debug from 'debug'
import { readdir } from 'node:fs/promises'

const dlog = debug('update-readmes')

const program = new Command()

program
    .version('0.0.1')
    .description(`A utility to update all of the README.md files in the project (assumes Memento monorepo structure).`)
    .requiredOption('-p, --provider <provider>', 'The provider to use [anthropic, ollama, openai, ...]')
    .requiredOption('-m, --model <model>', 'The model to use for summarization')
    .option('-P, --package <package>', 'Optionally update only the given package')
    .option('-R, --project-only', 'Optionally update only the project README.md file')

program.parse(process.argv)

async function updateOnePackageReadme(projectRoot: string, pkgPath: string, provider: Provider, model: string) {
    console.log(`Updating README.md for package: ${pkgPath}`)
    const args: AddPackageReadmeAgentArgs = { projectRoot, pkgPath, provider, model }
    const agent: AddPackageReadmeAgent = new AddPackageReadmeAgent(args)
    const readme = await agent.run()
    dlog(readme)
    const readme_path = `${projectRoot}/${pkgPath}/README.md`
    await Bun.write(readme_path, readme)
}

async function packagesInDir(dir: string): Promise<string[]> {
    return Array.from(await readdir(dir, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => `${dir}/${dirent.name}`)
}

async function main() {
    console.info('Running update-readmes utility...')
    const options = program.opts()

    if (options.projectOnly && !!options.package) {
        console.error(`Cannot specify both --project-only and --package`)
        process.exit(1)
    }

    const { provider, model } = options

    // This utility assumes the Memento project.
    // We might want to extend this utility to work on other projects, but it will need to be made more configurable
    // for that to happen.
    const projectRoot = getMementoProjectRoot()

    console.info(`Project root: ${projectRoot}`)

    const package_paths = (await packagesInDir('apps')).concat(await packagesInDir('packages'))

    if (options.package) {
        if (!package_paths.includes(options.package)) {
            console.error(`Package ${options.package} not found in project`)
            process.exit(1)
        }
        await updateOnePackageReadme(projectRoot, options.package, provider, model)
    } else {
        if (!options.projectOnly) {
            for (const pkg of package_paths) {
                await updateOnePackageReadme(projectRoot, pkg, provider, model)
            }
        }

        const addProjectReadmeAgent = new AddProjectReadmeAgent({ projectRoot, provider, model })
        const projectReadme = await addProjectReadmeAgent.run()
        console.log(`Updating project README.md`)
        await Bun.write(`${projectRoot}/README.md`, projectReadme.trim() + '\n')
    }
}

await main().catch(console.error)
