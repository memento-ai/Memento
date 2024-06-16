# @memento-ai/utils

## Description
The `@memento-ai/utils` package provides a set of utility functions and tools for the Memento project. It includes functionality for finding the project root directory, parsing input using Zod schemas with error handling and stack trace support, and removing common indentation from text blocks.

## Key Features
- `getProjectRoot()` function to obtain the root directory of the Memento project.
- `zodParse` function to parse input using Zod schemas with error handling and stack trace support.
- `stripCommonIndent` function to remove common indentation from a block of text.

## Usage and Examples

### Finding the Project Root
The `getProjectRoot()` function can be used to obtain the root directory of the Memento project, regardless of the current working directory. This is useful for building paths to other project files and resources.

```typescript
import { getProjectRoot } from '@memento-ai/utils';

const projectRoot = getProjectRoot();
console.log(projectRoot); // Output: /path/to/Memento
```

### Parsing with Zod
The `zodParse` function provides a convenient way to parse input using Zod schemas while handling errors gracefully. It includes stack trace support for easier debugging.

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
The `stripCommonIndent` function can be used to remove common indentation from a block of text. This is useful for creating multiline string literals in code which match the indent level of the code -- the function will strip the excess leading spaces.

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
