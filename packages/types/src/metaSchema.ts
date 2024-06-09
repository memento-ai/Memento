// Path: packages/types/src/metaSchema.ts

import { z } from 'zod';
import { Role } from './role';
import { CONV, DOC, FRAG, DSUM, SYN, MemKind, XCHG } from './memKind';
import { MetaId } from './metaArgs';

// The various *MetaData types are the logical database schema for each of the mem kinds.
// All metas are stored in one table, so all kinds could potentially use all columns,
// but in practice most meta kinds have unused columns.
// We define a base type where most columns are optional, and then extend that type
// to define which columns are actually materialized for each kind.

// Every kind must have these three columns:

export const RequiredMetaBase = z.object({
    kind: MemKind,      // The kind of the meta record
    id: MetaId,     // The id of the meta record
    memId: z.string(),  // The foreign key to the associated mem content.
    created_at: z.coerce.date(), // The time the meta record was created.
});

export const MemBaseMetaData = RequiredMetaBase.extend({
    priority: z.optional(z.number()).default(0),
    pinned: z.optional(z.boolean()).default(false),
    role: z.optional(Role),
    docid: z.optional(z.string()),
    source: z.optional(z.string()),
    summaryid: z.optional(z.string()),
});
export type MemBaseMetaData = z.TypeOf<typeof MemBaseMetaData>;

export const ConversationMetaData = RequiredMetaBase.extend({
    kind: z.literal(CONV),
    role: Role,
    docid: z.string()
});
export type ConversationMetaData = z.TypeOf<typeof ConversationMetaData>;

export const FragmentMetaData = RequiredMetaBase.extend({
    kind: z.literal(FRAG),
    docid: z.string(),
});
export type FragmentMetaData = z.TypeOf<typeof FragmentMetaData>;

export const DocumentMetaData = RequiredMetaBase.extend({
    kind: z.literal(DOC),
    source: z.string(),
    summaryid: z.string()
});
export type DocumentMetaData = z.TypeOf<typeof DocumentMetaData>;

export const DocSummaryMetaData = RequiredMetaBase.extend({
    kind: z.literal(DSUM),
    docid: z.string()
});
export type DocSummaryMetaData = z.TypeOf<typeof DocSummaryMetaData>;

export const SynopsisMetaData = RequiredMetaBase.extend({
    kind: z.literal(SYN),
});
export type SynopsisMetaData = z.TypeOf<typeof SynopsisMetaData>;

export const ConvExchangeMetaData = RequiredMetaBase.extend({
    kind: z.literal(XCHG),
});
export type ConvExchangeMetaData = z.TypeOf<typeof ConvExchangeMetaData>;

export const MemMetaData = z.discriminatedUnion('kind', [
    ConversationMetaData,
    DocSummaryMetaData,
    DocumentMetaData,
    FragmentMetaData,
    SynopsisMetaData,
    ConvExchangeMetaData,
]);
export type MemMetaData = z.TypeOf<typeof MemMetaData>;
