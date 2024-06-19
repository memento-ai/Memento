// Path: packages/readme-agents/src/AddPackageReadmeAgent.ts

import { Agent } from '@memento-ai/agent'
import type { ConversationInterface, ProviderAndModel } from '@memento-ai/conversation'
import { createConversation } from '@memento-ai/conversation'
import { gitListFilesFor, gitRepoRoot, stripCommonIndent } from '@memento-ai/utils'
import debug from 'debug'
import fs from 'node:fs'
import path from 'node:path'
import { packageReadmePromptTemplate } from './package-readme-prompt-template'

const dlog = debug('update-readmes')

export type AddPackageReadmeAgentArgs = ProviderAndModel & {
    projectRoot: string
    pkgPath: string
}

export class AddPackageReadmeAgent extends Agent {
    private projectRoot: string
    private package: string

    constructor({ projectRoot, pkgPath, provider, model }: AddPackageReadmeAgentArgs) {
        const conversation: ConversationInterface = createConversation(provider, {
            model,
            temperature: 0.0,
            max_response_tokens: 1500,
            logging: { name: 'pkg_readme' },
        })
        super({ conversation })
        this.projectRoot = projectRoot
        this.package = pkgPath
    }

    async getSources(): Promise<{ source: string; content: string }[]> {
        dlog(`Getting sources for package ${this.package}`)
        const root = gitRepoRoot()
        const dirPath = path.join(root, this.package)
        const filePaths = gitListFilesFor(dirPath)
        const sources = await Promise.all(
            filePaths.map(async (source) => {
                const fullPath = path.join(dirPath, source)
                const projectRelativePath = path.relative(root, fullPath)
                const content = await fs.promises.readFile(fullPath, 'utf-8')
                return { source: projectRelativePath, content }
            })
        )
        return sources
    }

    async generatePrompt(): Promise<string> {
        dlog(`Generating prompt for package ${this.package}`)
        const project_readme: string = await fs.promises.readFile(`${this.projectRoot}/README.md`, 'utf-8')
        const package_readme: string = await fs.promises.readFile(
            `${this.projectRoot}/${this.package}/README.md`,
            'utf-8'
        )
        const sources: { source: string; content: string }[] = await this.getSources()
        return packageReadmePromptTemplate({ project_readme, package_readme, sources })
    }

    async run(): Promise<string> {
        dlog(`Generating README for package ${this.package}`)
        const content = stripCommonIndent(`
            Generate the Package README.md file as instructed.
            Note: your response will verbatim replace the existing README.md file.
            Do not include any additional commentary, either preamble or postable, to your response.
        `)
        const packageReadme = await this.send({ content })
        return packageReadme.content.trim() + `\n`
    }
}
