// Path: packages/config/src/config.ts

import debug from 'debug'
import type { Stats } from 'node:fs'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, normalize, parse, resolve } from 'node:path'
import { cwd } from 'node:process'
import * as toml from 'toml'
import { Config } from './configSchema'
import type { PartialConfig } from './merge'
import { merge } from './merge'

const dlog = debug('config')

// Load the configuration from a specific file path -- throws an error if the file is not found
export async function loadConfig(configPath: string): Promise<Config> {
    dlog(`Loading aggregate config from ${configPath}`)
    let content: string
    try {
        content = readFileSync(configPath, { encoding: 'utf-8' })
    } catch (e) {
        dlog(`Error reading config file ${configPath}`)
        return Promise.reject(`Error reading config file ${configPath}: ${e}`)
    }
    const config = await toml.parse(content)
    return Config.parse(config)
}

// Load the configuration from a specific file path -- throws an error if the file is not found
export async function loadPartialConfig(configPath: string): Promise<PartialConfig> {
    dlog(`Loading aggregate config from ${configPath}`)
    let content: string
    try {
        content = readFileSync(configPath, { encoding: 'utf-8' })
    } catch (e) {
        dlog(`Error reading config file ${configPath}`)
        return Promise.reject(`Error reading config file ${configPath}: ${e}`)
    }
    return await toml.parse(content)
}

// Load the pure default configuration (not reading from a file)
export function loadDefaultConfig(): Config {
    return Config.parse({})
}

function* allParents(leafDir?: string): Generator<string> {
    let dir = directoryOf(leafDir) ?? cwd()
    while (true) {
        yield dir
        const parent = dirname(dir)
        if (parent === dir) {
            break
        }
        dir = parent
    }
    return
}

export async function loadNearestConfig(): Promise<Config> {
    for (const dir of allParents()) {
        const configPath = `${dir}/memento.toml`
        if (existsSync(configPath)) {
            return loadConfig(configPath)
        }
    }
    return loadDefaultConfig()
}

// Returns true iff the path is an actual existing file (not a directory)
function isActualFile(path?: string): path is string {
    if (path === undefined) {
        return false
    }
    const stats: Stats = statSync(path)
    return stats.isFile()
}

// Returns the directory of the path, or undefined if the path is undefined or does not exist
// If the path is a directory, it returns the path itself
function directoryOf(path?: string): string | undefined {
    if (path === undefined) {
        return undefined
    }
    const resolved = resolve(path)
    dlog({ resolved })
    const stats: Stats = statSync(resolved)
    if (stats.isDirectory()) {
        return path
    }
    const p = parse(normalize(resolved))
    return p.dir
}

// Loads a configuration that is constructed from all memento.toml files in the parent directories
// starting from the root directory to the current working directory, with the nearest directories
// taking precedence. If the leafPath is a file (of any name), it will also load the configuration
// from that file with that file taking precedence.
export async function loadAggregateConfig(leafPath: string): Promise<Config> {
    dlog(`Loading aggregate config from path ${leafPath}`)
    const leafDir = directoryOf(leafPath)
    dlog(`Loading aggregate config from ${leafDir}`)
    // Start with a config that is a pure default
    let config = loadDefaultConfig()
    const parents = Array.from(allParents(leafDir)).reverse()
    dlog(`Parents: ${parents}`)
    for (const dir of parents) {
        const configPath = `${dir}/memento.toml`
        if (existsSync(configPath)) {
            config = merge(config, await loadPartialConfig(configPath))
            dlog(configPath, config)
        }
    }
    if (isActualFile(leafPath)) {
        config = merge(config, await loadPartialConfig(leafPath))
    }
    return config
}
