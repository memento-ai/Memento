// Path: packages/config/src/config.ts

import { dirname, parse, normalize } from 'node:path'
import { existsSync, readFileSync, statSync } from 'node:fs';
import type { Stats } from 'node:fs';
import { z } from 'zod'
import { cwd } from 'node:process'
import debug from 'debug';
import toml from 'toml';
import _ from 'lodash';

const dlog = debug('config');

// The configuration here is for common parameters used in the app and excludes one time options
// See also example.memento.toml

export const ModelConfig = z.object({
    // The provider to use [anthropic, ollama, openai, ...]. See @memento-ai/conversation/src/provider.ts
    provider: z.string().default('anthropic'),

    // The name of the model to use -- specific to the provider
    model: z.string().default('haiku'),

    // Temperature
    temperature: z.number().default(0.0),
});


export const Config = z.object({
    // The name of the database to use
    database: z.string().default('memento'),

    memento_agent: ModelConfig.default({}),
    resolution_agent: ModelConfig.default({}),
    synopsis_agent: ModelConfig.extend({
        // The maximum number of synopses tokens in the additional context
        max_tokens: z.number().default(2000),
    }).default({}),

    conversation: z.object({
        // The conversation history will be limited to this number of exchanges
        // or this number of tokens, whichever comes first.
        max_exchanges: z.number().default(5),
        max_tokens: z.number().default(3000),
    }).default({}),

    search: z.object({
        // The maximum number of tokens returned by search for relevant content
        max_tokens: z.number().default(10000),

        // The number of keywords to extract from the message content
        // to use for keyword search.
        keywords: z.number().default(5),

        // The decay rates used for the exponential moving average of the scoring of search results.
        // Higher values emphasize more recent content.
        decay: z.object({
            // The decay rate applied to the score of the search results from user message content.
            // The decay rate for user content should probably be higher than the decay rate for assistant content.
            // so that the user's instructions carry more weight.
            user: z.number().min(0.25).max(1.0).default(0.5),
            asst: z.number().min(0.1).max(0.6).default(0.5),
        }).default({})
    }).default({}),
});
export type Config = z.infer<typeof Config>;

// Load the configuration from a specific file path -- throws an error if the file is not found
export async function loadConfig(configPath: string): Promise<Config> {
    dlog(`Loading aggregate config from ${configPath}`);
    let content: string;
    try {
        content = readFileSync(configPath, { encoding: 'utf-8' });
    }
    catch (e) {
        dlog(`Error reading config file ${configPath}`)
        return Promise.reject(`Error reading config file ${configPath}: ${e}`);
    }
    const config = await toml.parse(content);
    return Config.parse(config);
}

// Load the configuration from a specific file path -- throws an error if the file is not found
export async function loadPartialConfig(configPath: string): Promise<PartialConfig> {
    dlog(`Loading aggregate config from ${configPath}`);
    let content: string;
    try {
        content = readFileSync(configPath, { encoding: 'utf-8' });
    }
    catch (e) {
        dlog(`Error reading config file ${configPath}`)
        return Promise.reject(`Error reading config file ${configPath}: ${e}`);
    }
    return await toml.parse(content);
}

// Load the pure default configuration (not reading from a file)
export function loadDefaultConfig(): Config {
    return Config.parse({});
}

function* allParents(leafDir?: string): Generator<string> {
    let dir = directoryOf(leafDir) ?? cwd();
    while (true) {
        yield dir;
        const parent = dirname(dir);
        if (parent === dir) {
            break;
        }
        dir = parent;
    }
    return;
}

export async function loadNearestConfig(): Promise<Config> {
    for (const dir of allParents()) {
        const configPath = `${dir}/memento.toml`;
        if (existsSync(configPath)) {
            return loadConfig(configPath);
        }
    }
    return loadDefaultConfig();
}

// Returns true iff the path is an actual existing file (not a directory)
function isActualFile(path?: string) : path is string {
    if (path === undefined) {
        return false;
    }
    const stats: Stats = statSync(path);
    return stats.isFile();
}

// Returns the directory of the path, or undefined if the path is undefined or does not exist
// If the path is a directory, it returns the path itself
function directoryOf(path?: string): string | undefined {
    if (path === undefined) {
        return undefined;
    }
    const stats: Stats = statSync(path);
    if (stats.isDirectory()) {
        return path;
    }
    let p = parse(normalize(path));
    return p.dir;
}

// Loads a configuration that is constructed from all memento.toml files in the parent directories
// starting from the root directory to the current working directory, with the nearest directories
// taking precedence. If the leafPath is a file (of any name), it will also load the configuration
// from that file with that file taking precedence.
export async function loadAggregateConfig(leafPath?: string): Promise<Config> {
    let leafDir = directoryOf(leafPath) ?? cwd();
    dlog(`Loading aggregate config from ${leafDir}`);
    // Start with a config that is a pure default
    let config = loadDefaultConfig();
    const parents = Array.from(allParents(leafDir)).reverse();
    dlog(`Parents: ${parents}`)
    for (const dir of parents) {
        const configPath = `${dir}/memento.toml`;
        if (existsSync(configPath)) {
            config = merge(config, await loadPartialConfig(configPath));
            dlog(configPath, config);
        }
    }
    if (isActualFile(leafPath)) {
        config = merge(config, await loadPartialConfig(leafPath));
    }
    return config;
}

type DeepPartial<T> = Partial<{ [P in keyof T]: DeepPartial<T[P]> }>;

export type PartialConfig = DeepPartial<Config>;

export function merge(a: Config, b: PartialConfig): Config {
    return _.merge({}, a, b) as Config;
}
