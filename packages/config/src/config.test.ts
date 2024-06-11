// Path: packages/config/src/config.test.ts

import { expect, test, describe } from "bun:test";
import { Config, loadAggregateConfig, loadConfig, loadDefaultConfig, loadPartialConfig, merge} from "./config";
import type { PartialConfig } from "./config";
import { getProjectRoot } from "@memento-ai/utils";

const defaultConfig: Config = {
    database: "memento-foo.db",
    memento_agent: {
        provider: "anthropic",
        model: "haiku",
        temperature: 0,
    },
    resolution_agent: {
        provider: "anthropic",
        model: "haiku",
        temperature: 0,
    },
    synopsis_agent: {
        provider: "anthropic",
        model: "haiku",
        temperature: 0,
        max_tokens: 2000,
    },
    conversation: {
        max_exchanges: 5,
        max_tokens: 3000,
    },
    search: {
        max_tokens: 1234,
        keywords: 23,
        decay: {
        user: 0.5,
        asst: 0.5,
        },
    },
}

const foo: PartialConfig = {
    search: {
        max_tokens: 1234,
        keywords: 23,
    }
};

const fullFoo: Config = merge(defaultConfig, foo);

describe("Config", () => {
    test("Can load the default config", async () => {
        const config = loadDefaultConfig();
        expect(config).toBeDefined();
        const { memento_agent, resolution_agent, synopsis_agent, conversation, search } = config;
        expect(memento_agent).toBeDefined();
        expect(resolution_agent).toBeDefined();
        expect(synopsis_agent).toBeDefined();
        expect(conversation).toBeDefined();
        expect(search).toBeDefined();

        for (const agent of [memento_agent, resolution_agent, synopsis_agent]) {
            expect(agent.provider).toBeDefined();
            expect(agent.model).toBeDefined();
            expect(agent.temperature).toBeDefined();
        }

        const { max_exchanges, max_tokens } = conversation;
        expect(max_exchanges).toBeDefined();
        expect(max_tokens).toBeDefined();

        const { max_tokens: max_search_tokens, keywords, decay } = search;
        expect(max_search_tokens).toBeDefined();
        expect(keywords).toBeDefined();
        expect(decay).toBeDefined();
        expect(decay.user).toBeDefined();
        expect(decay.asst).toBeDefined();
    });

    test("Can load a specific config", async () => {
        const projectRoot = getProjectRoot();
        const configPath = `${projectRoot}/packages/config/src/test/memento.toml`;
        try {
            const config = await loadConfig(configPath);
            expect(config).toBeDefined();
        } catch (e) {
            console.error(e);
            throw e;
        }
    });

    test("Can load a partial config", async () => {
        const projectRoot = getProjectRoot();
        const partial = await loadConfig(`${projectRoot}/packages/config/src/test/b/a/foo.toml`);
        expect(partial).toStrictEqual(fullFoo);
    });

    test("Merge full config into partial config yields full config", async () => {
        const projectRoot = getProjectRoot();
        const partial = await loadConfig(`${projectRoot}/packages/config/src/test/b/a/foo.toml`);
        const full = await loadConfig(`${projectRoot}/packages/config/src/test/memento.toml`);
        expect(partial).not.toStrictEqual(full);
        const config = merge(partial, full);
        expect(config).toStrictEqual(full);
    });

    test("Merge partial config into full config yields changed config", async () => {
        const projectRoot = getProjectRoot();
        const full = await loadConfig(`${projectRoot}/packages/config/src/test/memento.toml`);
        const config = merge(full, foo);
        expect(config).not.toStrictEqual(full);
    });

    test("Throws an error if the config file is not found", async () => {
        const configPath = "nonexistent.toml";
        try {
            await loadConfig(configPath);
            expect(false).toBe(true);
        }
        catch (e) {
            expect(e).toInclude(`Error reading config file`);
        }
    });

    test("loadPartialConfig config of full config yields the config", async () => {
        const projectRoot = getProjectRoot();
        const configPath = `${projectRoot}/packages/config/src/test/b/memento.toml`;

        const expected = await loadConfig(configPath);
        const config = await loadPartialConfig(configPath);

        // Since b/memento.toml is a full config, expected should just be contents of b/memento.toml
        expect(config).toStrictEqual(expected);
    });


    test("loadAggregate config of full config yields the config", async () => {
        const projectRoot = getProjectRoot();
        const configPath = `${projectRoot}/packages/config/src/test/b/memento.toml`;

        const expected = await loadConfig(configPath);
        const config = await loadAggregateConfig(configPath);

        // Since b/memento.toml is a full config, expected should just be contents of b/memento.toml
        expect(config).toStrictEqual(expected);
    });


    test("Can load an aggregate config from a directory", async () => {
        const projectRoot = getProjectRoot();
        const configPath = `${projectRoot}/packages/config/src/test/b/a/foo.toml`;
        const config = await loadAggregateConfig(configPath);
        expect(config).toBeDefined();
        const expected = Config.parse({
            database: "memento-foo.db",     // from foo.toml
            memento_agent: {
                provider: "anthropic",
                model: "opus",
                temperature: 1.5,
            },
            resolution_agent: {
                provider: "anthropic",
                model: "sonnet",
                temperature: 1.25,
            },
            synopsis_agent: {
                provider: "anthropic",
                model: "haiku",
                temperature: 0.25,
                max_tokens: 1000,
            },
            conversation: {
                max_exchanges: 3,        // from a/memento.toml
                max_tokens: 1111,        // from a/memento.toml
            },
            search: {
                max_tokens: 1234,
                keywords: 23,
                decay: {
                    user: 0.25,
                    asst: 0.6,
                },
            },
        });
        expect(config).toStrictEqual(expected);
    });
});
