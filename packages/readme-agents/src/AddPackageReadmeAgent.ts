// Path: packages/readme-agents/src/AddPackageReadmeAgent.ts

import { Agent } from "@memento-ai/agent";
import { createConversation } from "@memento-ai/conversation";
import { stripCommonIndent } from "@memento-ai/utils";
import type { ProviderAndModel, ConversationInterface } from "@memento-ai/conversation";
import { packageReadmePromptTemplate } from "./package-readme-prompt-template";
import fs from 'node:fs';
import { $ } from "bun";
import debug from 'debug';

const dlog = debug("update-readmes");

export type AddPackageReadmeAgentArgs = ProviderAndModel & {
    projectRoot: string;
    pkgPath: string;
}

export class AddPackageReadmeAgent extends Agent {
    private projectRoot: string;
    private package: string;

    constructor({ projectRoot, pkgPath, provider, model }: AddPackageReadmeAgentArgs) {
        const conversation: ConversationInterface = createConversation(provider, { model, temperature: 0.0, max_response_tokens: 1500, logging: {name: 'pkg_readme'}  });
        super({conversation});
        this.projectRoot = projectRoot;
        this.package = pkgPath;
    }

    async getSources() : Promise<{ path: string, content: string }[]> {
        dlog(`Getting sources for package ${this.package}`);
        const { stdout, stderr, exitCode } = await $`git ls-files ${this.package}`.nothrow();
        if (exitCode !== 0) {
          throw new Error(stderr.toString());
        }
        const filePaths = stdout.toString().trim().split('\n');
        const sources = await Promise.all(filePaths.map(async (path) => {
            const content = await fs.promises.readFile(path, 'utf-8');
            return { path, content };
        }));
        return sources;
    }

    async generatePrompt() : Promise<string> {
        dlog(`Generating prompt for package ${this.package}`);
        const project_readme: string = await fs.promises.readFile(`${this.projectRoot}/README.md`, 'utf-8');
        const package_readme: string = await fs.promises.readFile(`${this.projectRoot}/${this.package}/README.md`, 'utf-8');
        const sources: { path: string, content: string }[] = await this.getSources();
        return packageReadmePromptTemplate({project_readme, package_readme, sources});
    }

    async run() : Promise<string> {
        dlog(`Generating README for package ${this.package}`);
        const content = stripCommonIndent(`
            Generate the Package README.md file as instructed.
            Note: your response will verbatim replace the existing README.md file.
            Do not include any additional commentary, either preamble or postable, to your response.
        `)
        const packageReadme = await this.send({content});
        return packageReadme.content.trim()+`\n`;
    }
}
