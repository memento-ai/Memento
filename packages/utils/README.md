# @memento-ai/utils

## Description
The `@memento-ai/utils` package provides a set of utility functions and tools for the Memento project. It includes functionality for finding the project root directory, generating README.md files for packages, and adding path comments to TypeScript files.

## Key Features
- `getProjectRoot()` function to obtain the root directory of the Memento project
- `AddPackageReadmeAgent` class to generate README.md files for packages based on their source files
- `add-path-comment.ts` script to automatically add or update path comments at the top of TypeScript files

## Usage and Examples

### Finding the Project Root
The `getProjectRoot()` function can be used to obtain the root directory of the Memento project, regardless of the current working directory. This is useful for building paths to other project files and resources.

```typescript
import { getProjectRoot } from '@memento-ai/utils';

const projectRoot = getProjectRoot();
console.log(projectRoot); // Output: /path/to/Memento
```

### Generating Package READMEs
The `AddPackageReadmeAgent` class can be used to generate a README.md file for a package based on the contents of its source files. This is particularly useful in a monorepo setup where you have multiple packages.

```typescript
import { AddPackageReadmeAgent } from '@memento-ai/utils';

const agent = new AddPackageReadmeAgent({ provider: 'anthropic', model: 'haiku' });
const readme = await agent.send({ content: packageSourceFiles });
await Bun.write('README.md', readme.content);
```

### Adding Path Comments
The `add-path-comment.ts` script can be used to automatically add or update path comments at the top of TypeScript files. This helps with code navigation and understanding the file structure of the project.

```
npm run add-path-comment
```

This will scan the project for all TypeScript files and ensure they have a path comment at the top of the file.
