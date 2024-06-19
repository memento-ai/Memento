// Path: packages/utils/src/git-ls-files.ts

import { gitRepoRoot } from './git-repo-root'
import { spawnCommandLine } from './spawn'

// gitListFiles is lists the repostitory files for the current working directory.
// Like `git ls-files`, the file paths returned are relative to the current working directory.
export function gitListFiles(): string[] {
    const text = spawnCommandLine('git ls-files')
    const result = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    return result
}

// gitListFilesFor is lists the repostitory files for the specified directory.
// The specified directory can be a directory on the local filesystem that it not in the current repository.
// The file paths returned are relative to the specified directory.
export function gitListFilesFor(dirPath: string): string[] {
    const text = spawnCommandLine(`git -C ${dirPath} ls-files`)
    const result = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    return result
}

// gitListRepositoryFiles returns the full relative paths of all files tracked by the current respository.
// The current repository is determined by the current working directory.
export function gitListRepositoryFiles(): string[] {
    const repoRoot = gitRepoRoot()
    return gitListFilesFor(repoRoot)
}
