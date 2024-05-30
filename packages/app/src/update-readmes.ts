// Path: packages/app/src/update-readmes.ts

import { Command } from 'commander';
import debug from 'debug';
import { AddPackageReadmeAgent, AddProjectReadmeAgent, type AddPackageReadmeAgentArgs } from '@memento-ai/readme-agents';
import { readdir } from 'node:fs/promises';
import { getProjectRoot } from '@memento-ai/utils';

const dlog = debug("update-readmes");

const program = new Command();

program
    .version('0.0.1')
    .description(`A utility to update all of the README.md files in the project (assumes Memento monorepo structure).`)
    .option('-p, --provider <provider>', 'The provider to use [anthropic, ollama, openai, ...]')
    .option('-m, --model <model>', 'The model to use for summarization');

program.parse(process.argv);

async function main() {
    console.info('Running update-readmes utility...');
    const options = program.opts();

    const { provider, model } = options;

    if (!provider) {
        console.error('You must specify an LLM provider');
        program.help();
    }

    if (!model) {
        console.error('You must specify a model supported by the provider');
        program.help();
    }

    const projectRoot = getProjectRoot();

    console.info(`Project root: ${projectRoot}`)

    const package_paths = Array.from(await readdir('packages', { withFileTypes: true })).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

    for (const pkg of package_paths) {
        const args: AddPackageReadmeAgentArgs = { projectRoot, pkg, provider, model };
        const agent: AddPackageReadmeAgent = new AddPackageReadmeAgent(args);
        const package_path = `packages/${pkg}`;
        console.info(`Processing package ${package_path}`);
        const readme = await agent.run();
        dlog(readme)
        const readme_path = `${projectRoot}/${package_path}/README.md`;
        await Bun.write(readme_path, readme);
    }

    const addProjectReadmeAgent = new AddProjectReadmeAgent({projectRoot, provider, model});
    const projectReadme = await addProjectReadmeAgent.run();
    await Bun.write(`${projectRoot}/README.md`, projectReadme.trim()+'\n');
}

main().catch(console.error);
