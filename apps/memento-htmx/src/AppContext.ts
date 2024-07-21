// Path: apps/memento-htmx/src/AppContext.ts

import { type MementoSystem } from '@memento-ai/memento-agent'

// Define the app state type
export interface AppState {
    system: MementoSystem
}

export type AppContext = {
    store: AppState
}
