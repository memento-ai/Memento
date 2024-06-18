// Path: packages/conversation/src/provider.ts

export const Providers = {
    // actual providers
    anthropic: 'anthropic',
    google: 'google',
    groq: 'groq',
    ollama: 'ollama',
    openai: 'openai',

    // mock provider
    mock: 'mock',
} as const

export const ProviderNames = Object.values(Providers)

export type Provider = (typeof Providers)[keyof typeof Providers]

export function isProvider(provider: string): provider is Provider {
    return ProviderNames.includes(provider as Provider)
}

export interface ProviderAndModel {
    provider: Provider
    model: string
}

// Default provider and model
// Ideally this could be a local model served by ollama,
// but so far I am not satisfied with any of the models I have tried.
export const defaultProviderAndModel: ProviderAndModel = {
    provider: 'anthropic',
    model: 'haiku',
}
