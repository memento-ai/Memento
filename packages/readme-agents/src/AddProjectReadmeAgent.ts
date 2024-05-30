// Path: packages/readme-agents/src/AddProjectReadmeAgent.ts

import { $ } from "bun";
import { Agent } from "@memento-ai/agent";
import { createConversation } from "@memento-ai/conversation";
import { rootReadmePromptTemplate } from "./project-readme-prompt-template";
import { stripCommonIndent } from "@memento-ai/utils";
import fs from 'node:fs';
import type { ProviderAndModel, ConversationInterface } from "@memento-ai/conversation";

export type AddProjectReadmeAgentArgs = ProviderAndModel & {
    projectRoot: string;
}

export class AddProjectReadmeAgent extends Agent {
    private projectRoot: string;

    constructor({ projectRoot, provider, model } : AddProjectReadmeAgentArgs) {
        const conversation: ConversationInterface = createConversation(provider, { model, temperature: 0.0, max_response_tokens: 1500, logging: {name: 'prj_readme'}  });
        super({conversation});
        this.projectRoot = projectRoot;
    }

    async getSourcePaths() : Promise<string[]> {
        const { stdout, stderr, exitCode } = await $`git ls-files`.quiet();
        if (exitCode !== 0) {
          throw new Error(stderr.toString());
        }
        const filePaths = stdout.toString().trim().split('\n');
        return filePaths;
    }

    async getReadmes() : Promise<{ package: string, content: string }[]> {
        const { stdout, stderr, exitCode } = await $`ls packages/*/README.md`.quiet();
        if (exitCode !== 0) {
          throw new Error(stderr.toString());
        }
        const readmePaths = stdout.toString().trim().split('\n');
        const readmes = await Promise.all(readmePaths.map(async (path) => {
            const pkg = path.split('/')[1];
            const content = await fs.promises.readFile(path, 'utf-8');
            return { package: pkg, content };
        }));
        return readmes;
    }

    async generatePrompt() : Promise<string> {
        const paths: string[] = await this.getSourcePaths();
        const root: string = await fs.promises.readFile(`${this.projectRoot}/README.md`, 'utf-8');
        const readmes: { package: string, content: string }[] = await this.getReadmes();
        return rootReadmePromptTemplate({paths, root, readmes});
    }

    async run() : Promise<string> {
        const content = stripCommonIndent(`
            Generate the Project README.md file as instructed.
            Note: your response will verbatim replace the existing README.md file.
            Do not include any additional commentary, either preamble or postable, to your response.
        `)
        const rootReadme = await this.send({content});
        return rootReadme.content.trim()+`\n`;
    }
}
