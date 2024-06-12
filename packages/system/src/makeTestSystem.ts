// Path: packages/system/src/makeTestSystem.ts

import { Config } from "@memento-ai/config";
import { ConversationConfig } from "@memento-ai/config";
import { createMementoSystem, type MementoSystem } from "./factory"

export type MakeTestSystemArgs = {
    database: string;

    // True if the agent is wanted.
    synopsis?: boolean;
    resolution?: boolean;
}

const provider = 'none';

export async function makeTestSystem(args: MakeTestSystemArgs ) : Promise<MementoSystem> {
    const { database, synopsis, resolution } = args;

    // If the agent is not wanted, we pass in disabledAgent.
    // If the agent is wanted, we pass in undefined, which will create an agent from default configuration.
    const settings: Partial<Config> = { database };
    if (!synopsis) {
        settings.synopsis_agent = { ...ConversationConfig.parse({provider}), max_tokens: 100};
    }
    if (!resolution) {
        settings.resolution_agent = ConversationConfig.parse({provider});
    }
    const config = Config.parse(settings);
    const system: MementoSystem = await createMementoSystem(config);
    return system;
}
