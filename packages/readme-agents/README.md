# @memento-ai/readme-agents

## Description
The `@memento-ai/readme-agents` package provides agents for generating README.md files for packages and the overall Memento project. These agents leverage the Memento AI system to analyze the source code and existing documentation to generate comprehensive and up-to-date README files.

## Key Features
- `AddPackageReadmeAgent`: Generates a README.md file for a specific package in the Memento monorepo, providing a description, key features, and usage examples based on the package's source code and existing documentation.
- `AddProjectReadmeAgent`: Generates the main README.md file for the entire Memento project, providing an overview of the project, its organization, requirements, getting started guide, and information about contributing and licensing.

## Usage and Examples

### AddPackageReadmeAgent
To generate a README.md file for a specific package, you can use the `AddPackageReadmeAgent` like this:

```typescript
import { AddPackageReadmeAgent } from '@memento-ai/readme-agents';
import { getProjectRoot } from '@memento-ai/utils';

const projectRoot = getProjectRoot();
const pkg = 'package-name'; // Replace with the desired package name
const agent = new AddPackageReadmeAgent({ projectRoot, pkg, provider: 'anthropic', model: 'haiku' });
const readme = await agent.run();
console.log(readme);
```

This will output the generated README.md content for the specified package.

### AddProjectReadmeAgent
To generate the main README.md file for the Memento project, you can use the `AddProjectReadmeAgent` like this:

```typescript
import { AddProjectReadmeAgent } from '@memento-ai/readme-agents';
import { getProjectRoot } from '@memento-ai/utils';

const projectRoot = getProjectRoot();
const agent = new AddProjectReadmeAgent({ projectRoot, provider: 'anthropic', model: 'haiku' });
const readme = await agent.run();
console.log(readme);
```

This will output the generated README.md content for the entire Memento project.
