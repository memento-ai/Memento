// Path: packages/types/src/memKind.ts

import { z } from 'zod';

export const CONV = 'conv' as const;
export const DOC = 'doc' as const;
export const FRAG = 'frag' as const;
export const DSUM = 'dsum' as const;
export const RES = 'res' as const;
export const SYN ='syn' as const;
export const XCHG = 'xchg' as const;


export const MemKindMap = {
    conv: CONV,     // Conversation mem: content of one message from user or assistant
    doc: DOC,       // Document mem: content of one whole document as ingested from the file system
    frag: FRAG,     // Fragment mem: a portion of a the associated document identified by docid
    dsum: DSUM,     // Document summary mem: condensed summary of a document constructed at ingest time
    res: RES,       // Resolution mem: a resolution made by the assistant
    syn: SYN,       // Message exchange synopsis (assistant's inner monologue)
    xchg: XCHG      // Exchange mem: a message pair between user and assistant
} as const;

export type MemKind = (typeof MemKindMap)[keyof typeof MemKindMap]
export const MemKindValues = Object.values(MemKindMap) as MemKind[];
export const MemKind = z.nativeEnum(MemKindMap);
