// Path: packages/app/src/update-readmes.ts

import { Command } from 'commander';
import debug from 'debug';
import { AddPackageReadmeAgent, AddProjectReadmeAgent, type AddPackageReadmeAgentArgs } from '@memento-ai/readme-agents';
import { readdir } from 'node:fs/promises';
import { getProjectRoot } from '@memento-ai/utils';
import type { Provider } from '@memento-ai/conversation';

const dlog = debug("update-readmes");

const program = new Command();

program
    .version('0.0.1')
    .description(`A utility to update all of the README.md files in the project (assumes Memento monorepo structure).`)
    .requiredOption('-p, --provider <provider>', 'The provider to use [anthropic, ollama, openai, ...]')
    .requiredOption('-m, --model <model>', 'The model to use for summarization')
    .option('-P, --package <package>', 'Optionally update only the given package')
    .option('-R, --project-only', 'Optionally update only the project README.md file');

program.parse(process.argv);

async function updateOnePackageReadme(projectRoot: string, pkg: string, provider: Provider, model: string) {
    const args: AddPackageReadmeAgentArgs = { projectRoot, pkg, provider, model };
    const agent: AddPackageReadmeAgent = new AddPackageReadmeAgent(args);
    const readme = await agent.run();
    dlog(readme)
    const readme_path = `${projectRoot}/packages/${pkg}/README.md`;
    await Bun.write(readme_path, readme);
}

async function main() {
    console.info('Running update-readmes utility...');
    const options = program.opts();

    if (options.projectOnly && !!options.package) {
        console.error(`Cannot specify both --project-only and --package`);
        process.exit(1);
    }

    const { provider, model } = options;

    const projectRoot = getProjectRoot();

    console.info(`Project root: ${projectRoot}`)

    const package_paths = Array.from(await readdir('packages', { withFileTypes: true })).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

    if (options.package) {
        if (!package_paths.includes(options.package)) {
            console.error(`Package ${options.package} not found in project`);
            process.exit(1);
        }
        await updateOnePackageReadme(projectRoot, options.package, provider, model);
    } else {

        if (!options.projectOnly) {
            for (const pkg of package_paths) {
                await updateOnePackageReadme(projectRoot, pkg, provider, model);
            }
        }

        const addProjectReadmeAgent = new AddProjectReadmeAgent({projectRoot, provider, model});
        const projectReadme = await addProjectReadmeAgent.run();
        await Bun.write(`${projectRoot}/README.md`, projectReadme.trim()+'\n');
    }

}

await main().catch(console.error);
