// Path: packages/readme-agents/src/project-readme-prompt-template.ts

import { stripCommonIndent } from "@memento-ai/utils";

import Handlebars from "handlebars";

export type RootReadmePromptTemplateArgs = {
    paths: string[],
    root: string,
    readmes: { package: string, content: string }[]
};

const rootReadmePromptTemplateText = stripCommonIndent(`
    <system>
    <instructions>
    Your task is to generate the Project README.md file for the Memento monorepo.
    Memento is a Typescript application that uses PostgreSQL, so source files are primarily
    Typescript (*.ts), but also include SQL files (*.sql) for database schema and queries.

    You'll be given a listing of the paths all source files in the repository, and the content
    of the README.md for each package in the repository.

    You'll also be given the content of the existing project README.md file. Your response will replace
    the existing project README.md file. Please make improvements that seem warranted, but retain
    existing content that might not be inferrable from the package READMEs.

    Be careful to notice when new packages have been added to the repository, and include them in the README.md.

    Note that the README.md content you generate will be visible to users of the Memento repository on GitHub,
    so it should be informative and well-organized.
    </instructions>

    <repository_source_paths>
    {{#each paths}}
    - {{{this}}}
    {{/each}}
    </repository_source_paths>

    <current_project_readme>
    {{{root}}}
    </current_project_readme>

    <package_readmes>
    {{#each readmes}}
    <package name="@memento-ai/{{package}}">
    {{{content}}}
    </package>
    {{/each}}
    </package_readmes>

    </system>
`);

export const rootReadmePromptTemplate = Handlebars.compile<RootReadmePromptTemplateArgs>(rootReadmePromptTemplateText);
