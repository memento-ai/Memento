// Path: packages/config/src/configSchema.ts

import { z } from 'zod'

export const AgentConversationConfig = z.object({
    // The role of the agent using this converstion: memento, resolution, synopsis, pkg_readme, prj_readme, etc.
    // This is primarily used for logging purposes.
    role: z.string().default('unknown'),

    // The provider to use [anthropic, ollama, openai, ...]. See @memento-ai/conversation/src/provider.ts
    provider: z.string().default('anthropic'),

    // The name of the model to use -- specific to the provider
    model: z.string().default('haiku'),

    // Temperature
    temperature: z.number().default(0.0),

    // The maximum number of tokens the LLM is allowed to generate in a response.
    max_response_tokens: z.number().default(500),
})
export type AgentConversationConfig = z.infer<typeof AgentConversationConfig>

export const MementoAgentConfig = AgentConversationConfig.extend({
    max_func_cycles: z.number().default(3),
})
export type MementoAgentConfig = z.infer<typeof MementoAgentConfig>

export const SearchConfig = z.object({
    // The number of keywords to extract from the message content
    // to use for keyword search.
    keywords: z.number().default(5),

    // The weights (decay factors) used for the exponential moving average of the scoring of search results.
    // Higher values emphasize more recent content.
    weight: z
        .object({
            // The weight applied to the score of the search results from user message content.
            // The weight for user content should probably be higher than the weight for assistant content.
            // so that the user's instructions carry more weight.
            // But note that these are decay factors. In both cases, (1.0-weight) is applied to the prior cumulative score.
            // User and asst messages alternate. The cumulative score is a single exponential moving average from
            // the recent conversational history.
            user: z.number().min(0.25).max(1.0).default(0.5),
            asst: z.number().min(0.1).max(0.6).default(0.5),
        })
        .default({}),

    // The desired number of tokens returned by search for relevant content.
    // The algorithm will return as many tokens as possible while staying under this limit.
    tokens: z.number().default(8000),
})
export type SearchConfig = z.infer<typeof SearchConfig>

export const Config = z.object({
    // The name of the database to use
    database: z.string().default('memento'),

    memento_agent: MementoAgentConfig.default({
        role: 'memento',
        max_response_tokens: 2000,
    }),

    resolution_agent: AgentConversationConfig.default({
        role: 'resolution',
        max_response_tokens: 200,
    }),

    synopsis_agent: AgentConversationConfig.default({
        role: 'synopsis',
        max_response_tokens: 100,
    }),

    search_context: SearchConfig.default({}),

    synopses: z
        .object({
            // The maximum number of tokens to include in the synopsis
            max_tokens: z.number().default(3000),
        })
        .default({}),

    conversation_snapshot: z
        .object({
            // The conversation snapshot will be limited to this number of exchanges
            // or this number of tokens, whichever comes first.
            max_exchanges: z.number().default(5),

            // The maximum number of tokens to include in the conversation snapshot
            max_tokens: z.number().default(3000),
        })
        .default({}),
})
export type Config = z.infer<typeof Config>
