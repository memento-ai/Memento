// Path: packages/conversation/src/anthropic_models.ts

const haiku = 'claude-3-haiku-20240307'
const sonnet = 'claude-3-sonnet-20240229'
const opus = 'claude-3-opus-20240229'

const modelAliases: Record<string, string> = {
    haiku,
    opus,
    sonnet,
}

export function getModel(model?: string): string {
    if (!model) {
        // default to haiku for cheaper pricing
        return haiku
    }

    // Is the string a known alias
    if (model in modelAliases) {
        return modelAliases[model]
    }

    // Is the string a known model
    const knownModels = [haiku, sonnet, opus]
    const found = knownModels.find((m) => m === model)

    if (found) {
        return found
    }

    throw new Error(`Unknown model: ${model}`)
}
