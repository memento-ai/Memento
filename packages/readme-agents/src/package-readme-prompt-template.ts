// Path: packages/readme-agents/src/package-readme-prompt-template.ts

import { stripCommonIndent } from "@memento-ai/utils";

import Handlebars from "handlebars";

export type PackageReadmePromptTemplateArgs = {
    project_readme: string,
    package_readme: string,
    sources: { path: string, content: string }[]
};

const packageReadmePromptTemplateText = stripCommonIndent(`
    # Instructions
    Your task is to generate a README.md file for one package in the Memento monorepo.
    Memento is a Typescript application that uses PostgreSQL, so source files are primarily
    Typescript (*.ts), but may also include SQL files (*.sql) for database schema and queries.

    You'll be given this content:
    - The content of the current project README.md file (to provide context and overview of the project).
    - The content of the current README.md file for the package (if present).
    - The content of the source files in the package.

    Your response will replace the existing README.md file for the package.
    You should examine the current README.md file to see if it is not up to date,
    possibly due to recent changes to the source files in the package.
    Update the document as warranted.
    If the current README.md is accurate and up to date you can simply respond with a copy
    of the current README.md content.

    The source files may include test files ending with .test.ts. Do not document these files,
    but they will likely be useful for providing context and example usage.

    The format of the package README.md file should be:
    \`\`\`markdown
    # Package Name
    ## Description
    Briefly describe what the package does.
    ## Key Features
    List the main features or capabilities of the package.
    ## Usage and Examples
    Describe how to use the package, with examples if applicable.
    \`\`\`

    ## Current Project README.md
    \`\`\`markdown
    {{project_readme}}
    \`\`\`

    ## Package README.md
    \`\`\`markdown
    {{package_readme}}
    \`\`\`

    ## Source Files
    The following are the contents of the source files in the package:
    {{#each sources}}
    ### File: {{this.path}}
    \`\`\`typescript
    {{this.content}}
    \`\`\`
    {{/each}}
`);

export const packageReadmePromptTemplate = Handlebars.compile<PackageReadmePromptTemplateArgs>(packageReadmePromptTemplateText);
