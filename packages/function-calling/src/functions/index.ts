// Path: packages/function-calling/src/functions/index.ts

// It is possible to dynamically import functions from a directory
// and register them with the function registry.
// However, it is probably better to manually import and register
// as we do here for two reasons:
// 1. we will want to be able to create multiple registries that have different subsets of functions
// 2. by manually importing we can create the RegisteredFunctions discrimated union

import { z } from 'zod';
import  { registerFunction, type FunctionRegistry } from '../functionRegistry';

export const registry: FunctionRegistry = {};

import addSynopsis, { AddSynopsis } from './addSynopsis';
import getCurrentTime, { GetCurrentTime } from './getCurrentTime';
import gitListFiles, { GitListFiles } from './gitListFiles';
import queryMementoView, { QueryMementoView } from './queryMementoView';
import readSourceFile, { ReadSourceFile } from './readSourceFile';

registerFunction(registry, addSynopsis);
registerFunction(registry, getCurrentTime);
registerFunction(registry, gitListFiles);
registerFunction(registry, queryMementoView);
registerFunction(registry, readSourceFile);

export const RegisteredFunctions = z.discriminatedUnion('name', [
    AddSynopsis,
    GetCurrentTime,
    GitListFiles,
    QueryMementoView,
    ReadSourceFile,
]);
export type RegisteredFunctions = z.infer<typeof RegisteredFunctions>;
