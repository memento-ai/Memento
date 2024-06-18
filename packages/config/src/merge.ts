// Path: packages/config/src/merge.ts

import _ from 'lodash'
import type { Config } from './configSchema'

type DeepPartial<T> = Partial<{ [P in keyof T]: DeepPartial<T[P]> }>
export type PartialConfig = DeepPartial<Config>

export function merge(a: Config, b: PartialConfig): Config {
    return _.merge({}, a, b) as Config
}
