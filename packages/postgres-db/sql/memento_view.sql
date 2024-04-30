-- The memento view is a convenient join of the meta and mem tables.
CREATE OR REPLACE VIEW memento AS
    SELECT
        mem.id as memid,
        mem.content as content,
        -- mem.embed_vector as embed_vector,   -- in general we don't want the MementoAgent to query this vector
        mem.tokens as tokens,
        mem.tssearch as tssearch,
        meta.created_at as created_at,
        meta.docid as docid,
        meta.id as id,
        meta.kind as kind,
        meta.pinned as pinned,
        meta.priority as priority,
        meta.role as role,
        meta.source as source,
        meta.summaryId as summaryid
    FROM meta LEFT JOIN mem ON mem.id = meta.memid;
