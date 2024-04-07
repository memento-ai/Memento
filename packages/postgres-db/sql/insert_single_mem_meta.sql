CREATE OR REPLACE PROCEDURE insert_single_mem_meta(
    p_mem_id TEXT,
    p_content TEXT,
    p_embed_vector vector(768), -- Adjust the type as needed
    p_tokens INT,
    p_meta_id TEXT,
    p_kind VARCHAR(4),
    p_pinned BOOLEAN,
    p_priority INT,
    p_role VARCHAR(10),
    p_source VARCHAR(128)
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert or ignore for `mem`
    INSERT INTO mem(id, content, embed_vector, tokens)
    VALUES (p_mem_id, p_content, p_embed_vector, p_tokens)
    ON CONFLICT (id) DO NOTHING;

    -- Insert `meta` for the `mem`
    INSERT INTO meta(id, memId, kind, pinned, priority, role, source)
    VALUES (p_meta_id, p_mem_id, p_kind, p_pinned, p_priority, p_role, p_source);
END;
$$;
