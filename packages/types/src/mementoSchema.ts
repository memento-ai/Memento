// Path: packages/types/src/mementoSchema.ts

import { z } from 'zod'
import {
    ConvExchangeMetaData,
    ConversationMetaData,
    DocSummaryMetaData,
    DocumentMetaData,
    FragmentMetaData,
    ResolutionMetaData,
    SynopsisMetaData,
} from './metaSchema'

// A "Memento" is record in the `memento` view.
// It combines a Meta data record with the linked Mem content record

export const MemBase = z.object({
    content: z.string(),
    tokens: z.number().optional(),
})
export type MemBase = z.infer<typeof MemBase>

export const ConversationMemento = ConversationMetaData.merge(MemBase)
export const DocumentMemento = DocumentMetaData.merge(MemBase)
export const FragmentMemento = FragmentMetaData.merge(MemBase)
export const DocSummaryMemento = DocSummaryMetaData.merge(MemBase)
export const ResolutionMemento = ResolutionMetaData.merge(MemBase)
export const SynopsisMemento = SynopsisMetaData.merge(MemBase)
export const ConvExchangeMemento = ConvExchangeMetaData.merge(MemBase)

export type ConversationMemento = z.infer<typeof ConversationMemento>
export type DocumentMemento = z.infer<typeof DocumentMemento>
export type FragmentMemento = z.infer<typeof FragmentMemento>
export type DocSummaryMemento = z.infer<typeof DocSummaryMemento>
export type ResolutionMemento = z.infer<typeof ResolutionMemento>
export type SynopsisMemento = z.infer<typeof SynopsisMemento>
export type ConvExchangeMemento = z.infer<typeof ConvExchangeMemento>

export const Memento = z.discriminatedUnion('kind', [
    ConversationMemento,
    DocumentMemento,
    FragmentMemento,
    DocSummaryMemento,
    ResolutionMemento,
    SynopsisMemento,
    ConvExchangeMemento,
])
export type Memento = z.infer<typeof Memento>
