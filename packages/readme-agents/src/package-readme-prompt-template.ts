// Path: packages/readme-agents/src/package-readme-prompt-template.ts

import { stripCommonIndent } from "@memento-ai/utils";

import Handlebars from "handlebars";

export type PackageReadmePromptTemplateArgs = {
    project_readme: string,
    package_readme: string,
    sources: { path: string, content: string }[]
};

const packageReadmePromptTemplateText = stripCommonIndent(`
    <system>
    <instructions>
    Your task is to generate a README.md file for one package in the Memento monorepo.
    Memento is a Typescript application that uses PostgreSQL, so source files are primarily
    Typescript (*.ts), but may also include SQL files (*.sql) for database schema and queries.

    You'll be given this content:
    - The content of the current project README.md file (to provide context and overview of the project).
    - The content of the current README.md file for the package (if present).
    - The content of the source files in the package.

    Your response will replace the existing README.md file for the package.

    <note_well>
    Examine the current README.md file carefully to determine if any parts are out of date.
    Look for:
    1. New key features implemented in the source files that are not documented in the README.md.
    2. Features (e.g. functions) that are documented in the README but are no longer present in the source files.
       Do not allow obsolete features to persist in the README.md. Examine import statements in the README file
       for references to functions that are no longer present in the source files. Fix the README to
       no longer refer to these functions in any way, rewriting any sample code in the README as necessary.
    </note_well>

    If the current README.md is accurate and up to date you can simply respond with a copy
    of the current README.md content.

    The source files may include test files ending with .test.ts. Do not document these files,
    but they will likely be useful for providing context and example usage, and you may refer
    to them in your response.

    The format of the package README.md file should be:
    <readme_format>
    # Package Name
    ## Description
    Briefly describe what the package does.
    ## Key Features
    List the main features or capabilities of the package.
    ## Usage and Examples
    Describe how to use the package, with examples if applicable.
    </readme_format>
    </instructions>

    <given_content>
    <current_project_readme>
    {{{project_readme}}}
    </current_project_readme>

    <current_package_readme>
    {{{package_readme}}}
    </current_package_readme>

    <package_source_files>
    {{#each sources}}
    <file path="{{this.path}}">
    {{{this.content}}}
    </file>
    {{/each}}
    </package_source_files>
    </given_content>
    </system>
`);

export const packageReadmePromptTemplate = Handlebars.compile<PackageReadmePromptTemplateArgs>(packageReadmePromptTemplateText);
