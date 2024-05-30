# @memento-ai/readme-agents

## Description
The `@memento-ai/readme-agents` package provides agents for generating README.md files for packages and the overall Memento project.

## Key Features
- `AddPackageReadmeAgent`: Generates a README.md file for a specific package in the Memento monorepo.
- `AddProjectReadmeAgent`: Generates the main README.md file for the entire Memento project.

## Usage and Examples

### AddPackageReadmeAgent
The `AddPackageReadmeAgent` can be used to generate a README.md file for a specific package in the Memento monorepo. Here's an example:

```typescript
import { AddPackageReadmeAgent } from '@memento-ai/readme-agents';
import { getProjectRoot } from '@memento-ai/utils';

const projectRoot = getProjectRoot();
const pkg = 'readme-agents';
const agent = new AddPackageReadmeAgent({ projectRoot, pkg, provider: 'anthropic', model: 'haiku' });
const readme = await agent.run();
console.log(readme);
```

This will output the contents of the README.md file for the package.

### AddProjectReadmeAgent
The `AddProjectReadmeAgent` can be used to generate the main README.md file for the entire Memento project. Here's an example:

```typescript
import { AddProjectReadmeAgent } from '@memento-ai/readme-agents';
import { getProjectRoot } from '@memento-ai/utils';

const projectRoot = getProjectRoot();
const agent = new AddProjectReadmeAgent({ projectRoot, provider: 'anthropic', model: 'haiku' });
const readme = await agent.run();
console.log(readme);
```

This will output the contents of the main README.md file for the Memento project.
