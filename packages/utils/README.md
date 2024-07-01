# @memento-ai/utils

## Description
The `@memento-ai/utils` package provides a set of utility functions and tools for the Memento project. It includes functionality for working with Git repositories, managing project structure, parsing input using Zod schemas, handling common tasks, and more.

## Key Features
- Git repository utilities:
  - `gitRepoRoot()` and `gitRepoRootForDir()` functions to obtain the root directory of the Git repository.
  - `gitListFiles()`, `gitListFilesFor()`, and `gitListRepositoryFiles()` functions to list files in a Git repository.
- `getMementoProjectRoot()` function to obtain the root directory of the Memento project.
- `zodParse` function to parse input using Zod schemas with error handling and stack trace support.
- `stripCommonIndent` function to remove common indentation from a block of text.
- `spawnCommand` and `spawnCommandLine` functions for reliable command execution.
- `createTemporaryWritable` function to create a temporary writable stream.

## Usage and Examples

### Finding the Git Repository Root
```typescript
import { gitRepoRoot, gitRepoRootForDir } from '@memento-ai/utils';

const repoRoot = gitRepoRoot();
console.log(repoRoot); // Output: /path/to/repo

const dirPath = '/path/to/some/dir';
const repoRootForDir = gitRepoRootForDir(dirPath);
console.log(repoRootForDir); // Output: /path/to/repo
```

### Listing Git Repository Files
```typescript
import { gitListFiles, gitListFilesFor, gitListRepositoryFiles } from '@memento-ai/utils';

const files = gitListFiles();
console.log(files); // Output: ['file1.ts', 'file2.ts', ...]

const filesInDir = gitListFilesFor('packages/utils');
console.log(filesInDir); // Output: ['src/git-ls-files.ts', ...]

const allRepoFiles = gitListRepositoryFiles();
console.log(allRepoFiles); // Output: ['packages/utils/src/git-ls-files.ts', ...]
```

### Finding the Memento Project Root
```typescript
import { getMementoProjectRoot } from '@memento-ai/utils';

const projectRoot = getMementoProjectRoot();
console.log(projectRoot); // Output: /path/to/Memento
```

### Parsing with Zod
```typescript
import { zodParse } from '@memento-ai/utils';
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

const input = { name: 'John', age: '30' };

const parsedInput = zodParse(schema, input);
console.log(parsedInput); // Output: { name: 'John', age: 30 }
```

### Stripping Common Indentation
```typescript
import { stripCommonIndent } from '@memento-ai/utils';

const text = `
    This is some text
    with common indentation.
`;

const strippedText = stripCommonIndent(text);
console.log(strippedText);
// Output:
// This is some text
// with common indentation.
```

### Spawning Commands
```typescript
import { spawnCommand, spawnCommandLine } from '@memento-ai/utils';

const output1 = spawnCommand(['ls', '-l']);
console.log(output1);

const output2 = spawnCommandLine('git status');
console.log(output2);
```

### Creating a Temporary Writable Stream
```typescript
import { createTemporaryWritable } from '@memento-ai/utils';
import { Writable } from 'node:stream';

const originalStream = new Writable(/* ... */);
const tempStream = createTemporaryWritable(originalStream);

// Use tempStream...

// Closing tempStream won't close the originalStream
tempStream.end();
```

These utility functions provide essential tools for working with Git repositories, managing project structure, and handling common tasks within the Memento project ecosystem.
