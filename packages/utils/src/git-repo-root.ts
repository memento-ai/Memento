// Path: packages/utils/src/git-repo-root.ts

import { spawnCommandLine } from './spawn'

// These functions should work for any directory within any local git repo (workspace).
// Memento will (eventually) be used to ingest source code from repos other than Memento itself,
// and will need to be able to introspect the source code layout of those repos.

// For contexts where the Memento project layout is required, it is probably better to use
// getMementoProjectRoot.

// This function returns the root of the git repository for the current working directory.
export function gitRepoRoot(): string {
    try {
        return spawnCommandLine('git rev-parse --show-toplevel')
    } catch (e) {
        console.error('Error getting git repo root:', e)
        throw e
    }
}

// This function returns the root of the git repository for the specified directory.
export function gitRepoRootForDir(dirPath: string): string {
    try {
        return spawnCommandLine(`git -C ${dirPath} rev-parse --show-toplevel`)
    } catch (e) {
        console.error('Error getting git repo root:', e)
        throw e
    }
}
