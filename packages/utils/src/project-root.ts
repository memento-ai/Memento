// Path: packages/utils/src/project-root.ts

import path from 'node:path'

/// getMementoProjectRoot: this function should only be called from contexts in which the
/// Memento project layout is required. This includes:
/// 1. unit tests
/// 2. locating source files in the project (e.g. for SQL queries)

/// This function is similar in some respects to gitRepoRoot, and for many contexts the
/// two functions will give the same result, but there are some important differences.
/// gitRepoRoot uses the git command line tool to find the root of the git repository,
/// whereas getMementoProjectRoot uses the path of this file to find the root of the project.

export function getMementoProjectRoot(): string {
    return path.normalize(`${import.meta.dirname}/../../..`)
}
