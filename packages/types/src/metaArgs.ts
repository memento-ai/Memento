// Path: packages/types/src/metaArgs.ts
import { z } from 'zod';
import { Role } from './role';
import { CONV, DOC, FRAG, DSUM, CSUM, SYN } from './memKind';

/// ==== Args objects are used to specify the required arguments to create the `meta` record.
// Since this is for a meta record, the content is not needed

// Note: For most of these *MetaArgs, we do not specify any `id` field, as the id is usually a nanoid generated automatically.
// The ConvSummaryMetaArgs is an exception, as it is the only type of `meta` record where the id is not a nanoid.

export const ConversationMetaArgs = z.object({
    kind: z.literal(CONV),
    role: Role,
    source: z.literal('conversation'),  // should also use 'function' or 'result' for the function output return on behalf of user
    priority: z.number().default(0),
});
export type ConversationMetaArgs = z.input<typeof ConversationMetaArgs>;

export const DocumentMetaArgs = z.object({
    kind: z.literal(DOC),
    // docId: z.string(),              // the id of the document. Must be provided to ensure doc and dsum are linked correctly
    summaryId: z.string(),          // the id of the associated summary
    source: z.string(),
});
export type DocumentMetaArgs = z.input<typeof DocumentMetaArgs>;

export const FragmentMetaArgs = z.object({
    kind: z.literal(FRAG),
    docId: z.string(),
});
export type FragmentMetaArgs = z.input<typeof FragmentMetaArgs>;

export const MetaId = z.string().regex(/^[\w-]+\/[\w-]+$/).transform(s => s.substring(0, 21))
    .describe('The metaId of the conversation summary to update or create. Must follow the category/topic convention. Will be truncated to 21 characters.');
export type MetaId = z.TypeOf<typeof MetaId>;

export const ConvSummaryMetaArgs = z.object({
    metaId: MetaId,
    kind: z.literal(CSUM),
    priority: z.number().optional().default(0),
    pinned: z.boolean().optional().default(false),
});
export type ConvSummaryMetaArgs = z.input<typeof ConvSummaryMetaArgs>;

export const DocSummaryMetaArgs = z.object({
    kind: z.literal(DSUM),
    docId: z.string(),      // the id of the meta for the associated document
    source: z.string(),     // The source of the document -- usually a file path
});
export type DocSummaryMetaArgs = z.input<typeof DocSummaryMetaArgs>;

export const SynopsisMetaArgs = z.object({
    kind: z.literal(SYN)
});
export type SynopsisMetaArgs = z.input<typeof SynopsisMetaArgs>;

export const MetaArgs = z.discriminatedUnion('kind', [
    ConversationMetaArgs, DocumentMetaArgs, FragmentMetaArgs, DocSummaryMetaArgs, ConvSummaryMetaArgs, SynopsisMetaArgs]);
export type MetaArgs = z.input<typeof MetaArgs>;