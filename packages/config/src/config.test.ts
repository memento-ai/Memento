// Path: packages/config/src/config.test.ts

import { getMementoProjectRoot } from '@memento-ai/utils'
import { describe, expect, test } from 'bun:test'
import type { PartialConfig } from '..'
import { Config, loadAggregateConfig, loadConfig, loadDefaultConfig, loadPartialConfig, merge, writeConfig } from '..'

// This is exactly what we expect a the default configuration to be (result of loadDefaultConfig())
const defaultConfig: Config = {
    database: 'memento',
    memento_agent: {
        role: 'memento',
        provider: 'anthropic',
        model: 'haiku',
        temperature: 0,
        max_response_tokens: 2000,
    },
    resolution_agent: {
        role: 'resolution',
        provider: 'anthropic',
        model: 'haiku',
        temperature: 0,
        max_response_tokens: 200,
    },
    synopsis_agent: {
        role: 'synopsis',
        provider: 'anthropic',
        model: 'haiku',
        temperature: 0,
        max_response_tokens: 100,
    },
    search_context: {
        keywords: 5,
        weight: {
            user: 0.5,
            asst: 0.5,
        },
        tokens: 8000,
    },
    synopses: {
        max_tokens: 3000,
    },
    conversation_snapshot: {
        max_exchanges: 5,
        max_tokens: 3000,
    },
}
const foo: PartialConfig = {
    database: 'memento-foo.db',
    search_context: {
        tokens: 1234,
        keywords: 23,
    },
}

const fullFoo: Config = merge(defaultConfig, foo)

describe('Config', () => {
    test('Round trip with default config', async () => {
        const config = loadDefaultConfig()
        expect(config).toBeDefined()
        expect(config).toStrictEqual(defaultConfig)
        const projectRoot = getMementoProjectRoot()
        const configPath = `${projectRoot}/example.memento.toml`
        writeConfig(config, configPath)
        const config2 = await loadConfig(configPath)
        expect(config2).toStrictEqual(config)
    })

    test('the default config has all sections', async () => {
        const config = loadDefaultConfig()
        expect(config).toBeDefined()
        expect(config).toStrictEqual(defaultConfig)

        const {
            database,
            memento_agent,
            resolution_agent,
            synopsis_agent,
            search_context,
            synopses,
            conversation_snapshot,
        } = config
        expect(database).toBeDefined()
        expect(memento_agent).toBeDefined()
        expect(resolution_agent).toBeDefined()
        expect(synopsis_agent).toBeDefined()
        expect(search_context).toBeDefined()
        expect(synopses).toBeDefined()
        expect(conversation_snapshot).toBeDefined()

        for (const agent of [memento_agent, resolution_agent, synopsis_agent]) {
            expect(agent.role).toBeDefined()
            expect(agent.provider).toBeDefined()
            expect(agent.model).toBeDefined()
            expect(agent.temperature).toBeDefined()
            expect(agent.max_response_tokens).toBeDefined()
        }

        const { keywords, weight, tokens } = search_context
        expect(keywords).toBeDefined()
        expect(weight).toBeDefined()
        expect(weight.user).toBeDefined()
        expect(weight.asst).toBeDefined()
        expect(tokens).toBeDefined()

        expect(synopses.max_tokens).toBeDefined()

        const { max_exchanges, max_tokens } = conversation_snapshot
        expect(max_exchanges).toBeDefined()
        expect(max_tokens).toBeDefined()
    })

    test('Can load a specific config', async () => {
        const projectRoot = getMementoProjectRoot()
        const configPath = `${projectRoot}/packages/config/src/test/memento.toml`
        try {
            const config = await loadConfig(configPath)
            expect(config).toBeDefined()
        } catch (e) {
            console.error(e)
            throw e
        }
    })

    test('Can load a partial config', async () => {
        const projectRoot = getMementoProjectRoot()
        const partial = await loadConfig(`${projectRoot}/packages/config/src/test/b/a/foo.toml`)
        expect(partial).toStrictEqual(fullFoo)
    })

    test('Merge full config into partial config yields full config', async () => {
        const projectRoot = getMementoProjectRoot()
        const partial = await loadConfig(`${projectRoot}/packages/config/src/test/b/a/foo.toml`)
        const full = await loadConfig(`${projectRoot}/packages/config/src/test/memento.toml`)
        expect(partial).not.toStrictEqual(full)
        const config = merge(partial, full)
        expect(config).toStrictEqual(full)
    })

    test('Merge partial config into full config yields changed config', async () => {
        const projectRoot = getMementoProjectRoot()
        const full = await loadConfig(`${projectRoot}/packages/config/src/test/memento.toml`)
        const config = merge(full, foo)
        expect(config).not.toStrictEqual(full)
    })

    test('Throws an error if the config file is not found', async () => {
        const configPath = 'nonexistent.toml'
        try {
            await loadConfig(configPath)
            expect(false).toBe(true)
        } catch (e) {
            expect(e).toInclude(`Error reading config file`)
        }
    })

    test('loadPartialConfig config of full config yields the config', async () => {
        const projectRoot = getMementoProjectRoot()
        const configPath = `${projectRoot}/packages/config/src/test/b/memento.toml`

        const expected = await loadConfig(configPath)
        const config = await loadPartialConfig(configPath)

        // Since b/memento.toml is a full config, expected should just be contents of b/memento.toml
        expect(config).toStrictEqual(expected)
    })

    test('loadAggregate config of full config yields the config', async () => {
        const projectRoot = getMementoProjectRoot()
        const configPath = `${projectRoot}/packages/config/src/test/b/memento.toml`

        const expected = await loadConfig(configPath)
        const config = await loadAggregateConfig(configPath)

        // Since b/memento.toml is a full config, expected should just be contents of b/memento.toml
        expect(config).toStrictEqual(expected)
    })

    test('Can load an aggregate config from a directory', async () => {
        const projectRoot = getMementoProjectRoot()
        const configPath = `${projectRoot}/packages/config/src/test/b/a/foo.toml`
        const config = await loadAggregateConfig(configPath)
        expect(config).toBeDefined()
        const expected = Config.parse({
            database: 'memento-foo.db', // from foo.toml
            memento_agent: {
                provider: 'anthropic',
                model: 'opus',
                temperature: 1.5,
                role: 'memento',
                max_response_tokens: 500,
            },
            resolution_agent: {
                provider: 'anthropic',
                model: 'sonnet',
                temperature: 1.25,
                role: 'resolution',
                max_response_tokens: 500,
            },
            synopsis_agent: {
                provider: 'anthropic',
                model: 'haiku',
                temperature: 0.25,
                max_response_tokens: 500,
                role: 'synopsis',
            },
            search_context: {
                tokens: 1234,
                keywords: 23,
                weight: {
                    user: 0.25,
                    asst: 0.6,
                },
            },
            synopses: {
                max_tokens: 31415, // from b/memento.toml
            },
            conversation_snapshot: {
                max_exchanges: 3, // from a/memento.toml
                max_tokens: 1111, // from a/memento.toml
            },
        })
        expect(config).toStrictEqual(expected)
    })
})
