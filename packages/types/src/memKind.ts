// Path: packages/types/src/memKind.ts

import { z } from 'zod';

export const CONV = 'conv' as const;
export const DOC = 'doc' as const;
export const FRAG = 'frag' as const;
export const DSUM = 'dsum' as const;
export const CSUM = 'csum' as const;
export const SYN ='syn' as const;
export const XCHG = 'xchg' as const;


export const MemKindMap = {
    conv: CONV,     // Conversation mem: content of one message from user or assistant
    doc: DOC,       // Document mem: content of one whole document as ingested from the file system
    frag: FRAG,     // Fragment mem: a portion of a the associated document identified by docId
    dsum: DSUM,     // Document summary mem: condensed summary of a document constructed at ingest time
    csum: CSUM,     // Conversation summary mem: summaries created and updated by the assistant to aid in long-term continuity
    syn: SYN,        // Message exchange synopsis (assistant's inner monologue)
    xchg: XCHG      // Exchange mem: a message pair between user and assistant
} as const;

export type MemKind = (typeof MemKindMap)[keyof typeof MemKindMap]
export const MemKind = z.nativeEnum(MemKindMap);
