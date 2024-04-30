-- The meta table is much like an index for all of the mem records.
-- It stores metadata about the mem records, such as their kind, source, etc.
-- The `memId` column is a foreign key to the `mem` table.
-- The 'kind' column is a string that specifies the kind of mem record and is the desriminator key
-- for a discriminator union -- see mementoSchema.ts for the details.
-- 'kind' values:
--     'conv' - conversation mems
--     'doc' - document mems -- whole documents add by ingester
--     'dsum' - document summary mems -- short summaries created by LLM, one per doucment
--     'frag' - fragment mems -- fragments of documents when ingester splits them (Not yet used)
--     'csum' - conversation summary mems -- summaries of conversations created by LLM
--     'sys' - system prompt mems -- short segments that together form the system prompt.
-- The 'created_at' column is a timestamp that is automatically set to the current time when the record is created.
-- We do not maintain an updated at column because we expect some changes (such as pinning) to occur
-- and not need to be tracked as updates.
-- The 'pinned' column is a boolean that specifies whether the mem record should be included in the
-- context provided to the LLM automatically without taking into account other hueristics.
-- All of the other columns have meanings that may be determined by the kind of the mem record:
-- 'priority'
--     This may be used for some mems like the priority column, but as a softer hueristic.
--     In other cases (such as 'sys' mems), it is used just to affect the sort order of the mems.
-- 'role'
--     For 'conv' mems this is constrained to be either 'user' or 'assistant'.
--     For other kinds of mems (in particular csum), it is a more flexible category label.
-- 'docid'
--     For 'frag' and 'dsum' mems this is the id of the document mem that is the parent of the fragment or summary.
--     For 'conv' mems this may be the id of the conversation mem (but which one: user or assistant?).
--     Not yet used for other kinds of mems.
-- 'source'
--     This is a string that specifies the source/orgination of the mem record.
--     For 'doc' mems this should be the URI of the document. Exact URI conventions are not yet defined.
--     For 'conv' mems we currently fix source to be 'conversation' -- may be changed in the future.
--     For 'frag' mems this field may not be needed as the 'docId' field may be sufficient.
           -- but perhaps we next to extend the URI concept to include fragments.
--     For 'csum' mems this could be the URI of the conversation. Exact URI conventions are not yet defined.
-- 'summaryid'
--     For 'doc' and 'frag' mems this is the id of the summary mem derived from the doc/frag content.
--     For 'conv' mems this is the id of the 'csum' summary mem for this conversation.
--         But we need to decide: one summary for both user and assitant, and one for the combined exchange?
CREATE TABLE meta(
    id VARCHAR(21) PRIMARY KEY,   -- nanoid
    memid VARCHAR(24) REFERENCES mem(id),
    kind VARCHAR(4) NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    priority INT DEFAULT 0,    -- 0 is low priority. high priority is unbounded
    role VARCHAR(10),          -- For 'conv' messages can only be "user" or "assistant". But less constrained for other kinds.
    docid VARCHAR(24),
    source VARCHAR(128),
    summaryid VARCHAR(24),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
