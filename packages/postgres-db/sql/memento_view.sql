CREATE OR REPLACE VIEW memento AS
    SELECT meta.id as id,
        mem.tokens as tokens,
        meta.kind as kind,
        meta.role as role,
        meta.pinned as pinned,
        meta.priority as priority,
        meta.created_at as created_at,
        mem.content as content,
        mem.embed_vector as embed_vector,
        mem.tssearch as tssearch
    FROM meta LEFT JOIN mem ON mem.id = meta.memId;
