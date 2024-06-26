# @memento-ai/add-path-comments

## Description
This package is a utility application that adds or updates the "Path" comment at the top of TypeScript files in the Memento project. The "Path" comment specifies the relative path of the file from the project root directory.

## Key Features
- Automatically adds a "Path" comment to TypeScript files that do not have one.
- Updates the "Path" comment in TypeScript files where it already exists but is outdated.
- Skips non-TypeScript files.
- Uses the Git repository to identify tracked files for processing.

## Usage and Examples
To use this utility, navigate to the root directory of the Memento project and run the following command:

```
nx run add-path-comments
```

This command will scan all the tracked files in the Git repository, identify TypeScript files, and either add or update the "Path" comment at the top of each file.

For example, if the file `apps/add-path-comments/src/main.ts` contains the following content:

```typescript
import fs from 'fs'
import path from 'path'

// ... rest of the code
```

The utility will add a "Path" comment at the top of the file:

```typescript
// Path: apps/add-path-comments/src/main.ts

import fs from 'fs'
import path from 'path'

// ... rest of the code
```

If the file already has a "Path" comment but it's outdated, the utility will update it to reflect the correct relative path:

```typescript
// Path: apps/add-path-comments/src/main.ts

import fs from 'fs'
import path from 'path'

// ... rest of the code
```

This utility helps maintain consistent file path comments across the Memento project, making it easier to identify the location of each file within the codebase. It only processes TypeScript files (`.ts` extension) and skips all other file types.
