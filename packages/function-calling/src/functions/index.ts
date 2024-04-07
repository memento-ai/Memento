// File: src/lib/functions/index.ts

import { Glob } from 'bun';
import type { FunctionConfig } from '../functionRegistry';

export type FunctionRegistry = Record<string, FunctionConfig<any, any>>;
export const registry: FunctionRegistry = {};

function registerFunction<Input, Output>(config: FunctionConfig<Input, Output>) {
    registry[config.name] = config;
}

const dir = import.meta.dir;
const glob = new Glob(`**/*.ts`);

const files = Array.from(glob.scanSync(dir)).sort();

for await (const file of files) {
    if (file.includes('index.ts')) continue;
    if (glob.match(file))
    {
        const module = await import(import.meta.resolveSync(`${dir}/${file}`));
        registerFunction(module.default);
    }
}
