// Path: packages/types/src/metaArgs.ts

import { z } from 'zod';
import { Role } from './role';
import { CONV, DOC, FRAG, DSUM, SYN, XCHG, RES } from './memKind';

/// ==== Args objects are used to specify the required arguments to create the `meta` record.
// Since this is for a meta record, the content is not needed

export const ConversationMetaArgs = z.object({
    kind: z.literal(CONV),
    role: Role,
    source: z.literal('conversation'),  // should also use 'function' or 'result' for the function output return on behalf of user
    priority: z.number().default(1),
    docid: z.string().optional(),       // the id of the exchange memento
});
export type ConversationMetaArgs = z.input<typeof ConversationMetaArgs>;

export const DocumentMetaArgs = z.object({
    kind: z.literal(DOC),
    summaryid: z.string(),          // the id of the associated summary
    source: z.string(),
});
export type DocumentMetaArgs = z.input<typeof DocumentMetaArgs>;

export const FragmentMetaArgs = z.object({
    kind: z.literal(FRAG),
    docid: z.string(),
});
export type FragmentMetaArgs = z.input<typeof FragmentMetaArgs>;

export const MetaId = z.string().regex(/^[a-z0-9-]+$/, 'The metaId must be kebab-case lowercase alphanumeric')
    .transform(value => value.slice(0, 21))
    .describe('The metaId of the conversation summary. Lower-case, kebab-case, alphanumeric. Will be truncated to 21 characters.');
export type MetaId = z.TypeOf<typeof MetaId>;

export const DocSummaryMetaArgs = z.object({
    kind: z.literal(DSUM),
    docid: z.string(),      // the id of the meta for the associated document
    source: z.string(),     // The source of the document -- usually a file path
});
export type DocSummaryMetaArgs = z.input<typeof DocSummaryMetaArgs>;

export const SynopsisMetaArgs = z.object({
    kind: z.literal(SYN)
});
export type SynopsisMetaArgs = z.input<typeof SynopsisMetaArgs>;

export const ResolutionMetaArgs = z.object({
    kind: z.literal(RES)
});
export type ResolutionMetaArgs = z.input<typeof ResolutionMetaArgs>;

export const ConvExchangeMetaArgs = z.object({
    kind: z.literal(XCHG),
});
export type ConvExchangeMetaArgs = z.input<typeof ConvExchangeMetaArgs>;

export const MetaArgs = z.discriminatedUnion('kind', [
    ConversationMetaArgs, DocumentMetaArgs, FragmentMetaArgs, DocSummaryMetaArgs, ResolutionMetaArgs, SynopsisMetaArgs, ConvExchangeMetaArgs]);
export type MetaArgs = z.input<typeof MetaArgs>;
