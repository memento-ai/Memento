import { z } from 'zod';

const Role = z.enum(['user', 'assistant']);
export type Role = z.TypeOf<typeof Role>;

export const { user: USER, assistant: ASSISTANT } = Role.enum;

const MemKind = z.enum(['conv', 'doc', 'frag', 'sys', 'dsum', 'csum']);
export type MemKind = z.TypeOf<typeof MemKind>;

export const {
    conv: CONV,     // Conversation mem: content of one message from user or assistant
    doc: DOC,       // Document mem: content of one whole document as ingested from the file system
    frag: FRAG,     // Fragment mem: a portion of a the associated document identified by docId
    sys: SYS,       // System mem: a piece of the system prompt
    dsum: DSUM,     // Document summary mem: condensed summary of a document constructed at ingest time
    csum: CSUM,     // Conversation summary mem: summaries created and updated by the assistant to aid in long-term continuity
} = MemKind.enum;

export const Message = z.object({
    content: z.string(),
    role: Role
});
export type Message = z.TypeOf<typeof Message>;

/// We need to distinguish between the input type (which may have optional properties)
/// and the stored type (which must be complete).

/// The types below are input types.

export const Mem = z.object({
    id: z.string(),
    content: z.string(),
    embed_vector: z.array(z.number()), // Assuming embedding is an array of numbers
    tokens: z.number(),   // a count of the tokens in content
});
export type Mem = z.TypeOf<typeof Mem>;

/// ==== Args objects are used to specify the required arguments to create the `meta` record.
// Since this is for a meta record, the content is not needed

export const SystemMetaArgs = z.object({
    kind: z.literal(SYS),
    priority: z.number(),
    pinned: z.literal(true),
});
export type SystemMetaArgs = z.TypeOf<typeof SystemMetaArgs>;

export const ConversationMetaArgs = z.object({
    kind: z.literal(CONV),
    role: Role,
    source: z.literal('conversation'),  // should also use 'function' or 'result' for the function output return on behalf of user
    priority: z.number().default(0),
});
export type ConversationMetaArgs = z.TypeOf<typeof ConversationMetaArgs>;

export const DocumentMetaArgs = z.object({
    kind: z.literal(DOC),
    docId: z.string(),              // the id of the document. Must be provided to ensure doc and dsum are linked correctly
    summaryId: z.string(),          // the id of the associated summary
    source: z.string(),
});
export type DocumentMetaArgs = z.TypeOf<typeof DocumentMetaArgs>;

export const FragmentMetaArgs = z.object({
    kind: z.literal(FRAG),
    docId: z.string(),
});
export type FragmentMetaArgs = z.TypeOf<typeof FragmentMetaArgs>;

export const ConvSummaryMetaArgs = z.object({
    kind: z.literal(CSUM),
    priority: z.number().default(0),
    pinned: z.boolean().default(false),
});
export type ConvSummaryMetaArgs = z.TypeOf<typeof ConvSummaryMetaArgs>;

export const DocSummaryMetaArgs = z.object({
  kind: z.literal(DSUM),
  summaryId: z.string(),  // the id of the meta for this summary
  docId: z.string(),      // the id of the meta for the associated document
  source: z.string(),     // The source of the document -- usually a file path
});
export type DocSummaryMetaArgs = z.TypeOf<typeof DocSummaryMetaArgs>;

export const MetaArgs = z.discriminatedUnion('kind', [
    SystemMetaArgs, ConversationMetaArgs, DocumentMetaArgs, FragmentMetaArgs, DocSummaryMetaArgs, ConvSummaryMetaArgs]);
export type MetaArgs = z.TypeOf<typeof MetaArgs>;

export const MemBaseMetaData = z.object({
    kind: MemKind,
    id: z.string(),
    memId: z.string(),
    priority: z.optional(z.number()).default(0),
    pinned: z.optional(z.boolean()).default(false),
    role: z.optional(Role),
    docId: z.optional(z.string()),
    source: z.optional(z.string()),
    summaryId: z.optional(z.string()),
});
export type MemBaseMetaData = z.TypeOf<typeof MemBaseMetaData>;

export const SystemMetaData = MemBaseMetaData.extend({
    kind: z.literal(SYS),
    priority: z.number(),
    pinned: z.literal(true),
});
export type SystemMetaData = z.TypeOf<typeof SystemMetaData>;

export const ConversationMetaData = MemBaseMetaData.extend({
    kind: z.literal(CONV),
    role: Role
});
export type ConversationMetaData = z.TypeOf<typeof ConversationMetaData>;

export const FragmentMetaData = MemBaseMetaData.extend({
    kind: z.literal(FRAG),
    docId: z.string(),
});
export type FragmentMetaData = z.TypeOf<typeof FragmentMetaData>;

export const DocumentMetaData = MemBaseMetaData.extend({
    kind: z.literal(DOC),
    source: z.string(),
    summaryId: z.string()
});
export type DocumentMetaData = z.TypeOf<typeof DocumentMetaData>;

export const ConvSummaryMetaData = MemBaseMetaData.extend({
    kind: z.literal(CSUM),
    content: z.string(),
    priority: z.number().default(0),
    pinned: z.boolean().default(false),
});
export type ConvSummaryMetaData = z.TypeOf<typeof ConvSummaryMetaData>;

export const DocSummaryMetaData = MemBaseMetaData.extend({
    kind: z.literal(DSUM),
    content: z.string(),
    docId: z.string()
});
export type DocSummaryMetaData = z.TypeOf<typeof DocSummaryMetaData>;

export const MemMetaData = z.discriminatedUnion('kind', [
    ConversationMetaData,
    ConvSummaryMetaData,
    DocSummaryMetaData,
    DocumentMetaData,
    FragmentMetaData,
    SystemMetaData,
]);
export type MemMetaData = z.TypeOf<typeof MemMetaData>;
