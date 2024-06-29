# @memento-ai/readme-agents

## Description

The `@memento-ai/readme-agents` package provides agents for generating comprehensive README.md files for packages and the overall Memento project. These agents leverage the Memento AI system to analyze the source code, existing documentation, project structure, and other relevant information to generate informative and up-to-date README files.

## Key Features

- **`AddPackageReadmeAgent`**: Generates a README.md file for a specific package in the Memento monorepo. It analyzes the package's source code, existing documentation (if present), and provides a description, key features, usage examples, and ensures the documentation is up-to-date with the latest codebase.

- **`AddProjectReadmeAgent`**: Generates the main README.md file for the entire Memento project. It provides an overview of the project, its organization, requirements, getting started guide, and information about contributing and licensing. It also ensures that the documentation accurately reflects the current state of the project, including any new or removed packages.

- **Customizable Templates**: Uses Handlebars templates for generating prompts, allowing for easy customization of the README generation process.

- **Source Code Analysis**: Automatically retrieves and analyzes source files within packages to ensure accurate documentation.

- **Token Counting**: Utilizes token counting to optimize prompt generation and ensure compatibility with model context limits.

## Usage and Examples

### AddPackageReadmeAgent

To generate a README.md file for a specific package, you can use the `AddPackageReadmeAgent` like this:

```typescript
import { AddPackageReadmeAgent } from '@memento-ai/readme-agents';
import { getMementoProjectRoot } from '@memento-ai/utils';
import { defaultProviderAndModel } from '@memento-ai/conversation';

const projectRoot = getMementoProjectRoot();
const pkgPath = 'packages/package-name'; // Replace with the desired package path
const { provider, model } = defaultProviderAndModel;
const agent = new AddPackageReadmeAgent({ projectRoot, pkgPath, provider, model });
const readme = await agent.run();
console.log(readme);
```

This will output the generated README.md content for the specified package.

### AddProjectReadmeAgent

To generate the main README.md file for the Memento project, you can use the `AddProjectReadmeAgent` like this:

```typescript
import { AddProjectReadmeAgent } from '@memento-ai/readme-agents';
import { getMementoProjectRoot } from '@memento-ai/utils';
import { defaultProviderAndModel } from '@memento-ai/conversation';

const projectRoot = getMementoProjectRoot();
const { provider, model } = defaultProviderAndModel;
const agent = new AddProjectReadmeAgent({ projectRoot, provider, model });
const readme = await agent.run();
console.log(readme);
```

This will output the generated README.md content for the entire Memento project.

Both agents use the `createConversation` function from `@memento-ai/conversation` to set up the AI model interaction with specific parameters like temperature and maximum response tokens.

Note: The agents rely on the project structure and Git repository information to gather necessary data for README generation. Ensure that you're running these agents from within the Memento project repository for accurate results.
