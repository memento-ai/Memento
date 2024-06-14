// Path: packages/config/src/configSchema.ts

import { z } from "zod";

export const ConversationConfig = z.object({

    // The role of the agent using this converstion: memento, resolution, synopsis, pkg_readme, prj_readme, etc.
    // This is primarily used for logging purposes.
    role: z.string().default('unknown'),

    // The provider to use [anthropic, ollama, openai, ...]. See @memento-ai/conversation/src/provider.ts
    provider: z.string().default('anthropic'),

    // The name of the model to use -- specific to the provider
    model: z.string().default('haiku'),

    // Temperature
    temperature: z.number().default(0.0),
});
export type ConversationConfig = z.infer<typeof ConversationConfig>;


export const Config = z.object({
    // The name of the database to use
    database: z.string().default('memento'),

    memento_agent: ConversationConfig.default({ role: 'memento'}),
    resolution_agent: ConversationConfig.default({ role: 'resolution'}),
    synopsis_agent: ConversationConfig.extend({
        // The maximum number of synopses tokens in the additional context
        max_tokens: z.number().default(2000),
    }).default({ role: 'synopsis' }),

    conversation: z.object({
        // The conversation history will be limited to this number of exchanges
        // or this number of tokens, whichever comes first.
        max_exchanges: z.number().default(5),

        // The maximum number of response tokens
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
