// Path: packages/utils/src/project-root.ts

import path from 'node:path'

/// getProjectRoot: this function is called from unit tests to find the root of the project.
/// We want this function to be independent of the current working directory, so it is based
/// on the path of this file instead. We assume that this file is located at the path
/// `{projectRoot}/packages/utils/src/project-root.ts` so we can obtain the project root
/// simply normalizing a relative path.

export function getProjectRoot(): string {
    return path.normalize(`${import.meta.dirname}/../../..`)
}
