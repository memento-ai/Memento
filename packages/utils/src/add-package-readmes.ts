// Path: packages/utils/src/add-package-readmes.ts
import { Command } from 'commander';
import debug from 'debug';
import { AddPackageReadmeAgent, type ProviderAndModel } from './add-package-readme-agent';
import { $ } from "bun";
import { readdir } from 'node:fs/promises';
import { getProjectRoot } from './project-root';

const dlog = debug("add-package-readmes");

const program = new Command();

program
    .version('0.0.1')
    .description(`A utility to generate a README.md file for each package in the project (assumes Memento monorepo structure).`)
    .option('-p, --provider <provider>', 'The provider to use [anthropic, ollama, openai')
    .option('-m, --model <model>', 'The model to use for summarization');

program.parse(process.argv);

async function main() {
    console.info('Running add-package-readmes utility...');
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

    const args: ProviderAndModel = { provider, model };

    const agent : AddPackageReadmeAgent = new AddPackageReadmeAgent(args);

    const projectRoot = getProjectRoot();
    console.info(`Project root: ${projectRoot}`)

    const package_paths = Array.from(await readdir('packages', { withFileTypes: true })).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

    for (const package_name of package_paths) {
        const package_path = `packages/${package_name}`;
        console.info(`Processing package ${package_path}`);
        const stdout  = (await $`git ls-files ${package_path}`).text();
        let pathList: string[] = stdout.toString().split('\n').map(p => p.trim()).filter(p => p.length > 0);
        pathList.push(`README.md`)
        const content = (await Promise.all(pathList.map(async p => {
            const fullPath = `${projectRoot}/${p}`;
            const fileContent = await Bun.file(fullPath).text();
            return `\`\`\`${p}\n${fileContent}\`\`\``;
        }))).join('\n\n');
        const readme_path = `${projectRoot}/${package_path}/README.md`;
        const readme =  await agent.send({content});
        dlog(readme)
        await Bun.write(readme_path, readme.content+'\n');
    }
}

main().catch(console.error);
