// Path: packages/types/src/mementoSchema.ts

import { z } from 'zod';
import { Mem } from './memSchema';
import { ConvSummaryMetaData, ConversationMetaData, DocSummaryMetaData, DocumentMetaData, FragmentMetaData, SynopsisMetaData } from './metaSchema';

// A "Memento" is record in the `memento` view.
// It combines a Meta data record with the linked Mem content record

export const ConversationMemento = z.union([ ConversationMetaData, Mem]);
export const DocumentMemento = z.union([ DocumentMetaData, Mem ]);
export const FragmentMemento = z.union([ FragmentMetaData, Mem ]);
export const DocSummaryMemento = z.union([ DocSummaryMetaData, Mem ]);
export const ConvSummaryMemento = z.union([ ConvSummaryMetaData, Mem ]);
export const SynopsisMemento = z.union([ SynopsisMetaData, Mem ]);

export type ConversationMemento = z.infer<typeof ConversationMemento>;
export type DocumentMemento = z.infer<typeof DocumentMemento>;
export type FragmentMemento = z.infer<typeof FragmentMemento>;
export type DocSummaryMemento = z.infer<typeof DocSummaryMemento>;
export type ConvSummaryMemento = z.infer<typeof ConvSummaryMemento>;
export type SynopsisMemento = z.infer<typeof SynopsisMemento>;

export const Memento = z.union([
    ConversationMemento,
    DocumentMemento,
    FragmentMemento,
    DocSummaryMemento,
    ConvSummaryMemento,
    SynopsisMemento,
]);
export type Memento = z.infer<typeof Memento>;
