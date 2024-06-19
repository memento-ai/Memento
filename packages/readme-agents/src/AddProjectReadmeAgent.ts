// Path: packages/readme-agents/src/AddProjectReadmeAgent.ts

import { Agent } from '@memento-ai/agent'
import type { ConversationInterface, ProviderAndModel } from '@memento-ai/conversation'
import { createConversation } from '@memento-ai/conversation'
import { gitListRepositoryFiles, stripCommonIndent } from '@memento-ai/utils'
import fs from 'node:fs'
import { rootReadmePromptTemplate } from './project-readme-prompt-template'

export type AddProjectReadmeAgentArgs = ProviderAndModel & {
    projectRoot: string
}

export class AddProjectReadmeAgent extends Agent {
    private projectRoot: string

    constructor({ projectRoot, provider, model }: AddProjectReadmeAgentArgs) {
        const conversation: ConversationInterface = createConversation(provider, {
            model,
            temperature: 0.0,
            max_response_tokens: 1500,
            logging: { name: 'prj_readme' },
        })
        super({ conversation })
        this.projectRoot = projectRoot
    }

    getSourcePaths(): string[] {
        return gitListRepositoryFiles()
    }

    async getReadmes(): Promise<{ package: string; content: string }[]> {
        const paths: string[] = gitListRepositoryFiles()
        const readmePaths = paths.filter((path) => path.endsWith('README.md'))
        const readmes = await Promise.all(
            readmePaths.map(async (path) => {
                const pkg = path.split('/')[1]
                const content = await fs.promises.readFile(path, 'utf-8')
                return { package: pkg, content }
            })
        )
        return readmes
    }

    async generatePrompt(): Promise<string> {
        const paths: string[] = gitListRepositoryFiles()
        const root: string = await fs.promises.readFile(`${this.projectRoot}/README.md`, 'utf-8')
        const readmes: { package: string; content: string }[] = await this.getReadmes()
        return rootReadmePromptTemplate({ paths, root, readmes })
    }

    async run(): Promise<string> {
        const content = stripCommonIndent(`
            Generate the Project README.md file as instructed.
            Note: your response will verbatim replace the existing README.md file.
            Do not include any additional commentary, either preamble or postamble, to your response.
        `)
        const rootReadme = await this.send({ content })
        return rootReadme.content.trim() + `\n`
    }
}
