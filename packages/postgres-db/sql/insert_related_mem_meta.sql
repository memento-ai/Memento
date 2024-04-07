CREATE OR REPLACE PROCEDURE insert_related_mem_meta(
    -- Parameters for the document
    p_doc_mem_id TEXT,
    p_doc_content TEXT,
    p_doc_embed_vector vector(768),
    p_doc_tokens INT,
    p_doc_meta_id TEXT,
    p_doc_kind VARCHAR(4),
    p_doc_role VARCHAR(10),
    p_doc_source VARCHAR(128),
    -- Parameters for the summary
    p_sum_mem_id TEXT,
    p_sum_content TEXT,
    p_sum_embed_vector vector(768),
    p_sum_tokens INT,
    p_sum_meta_id TEXT,
    p_sum_kind VARCHAR(4),
    p_sum_role VARCHAR(10),
    p_sum_source VARCHAR(128)
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Call the basic insert procedure for the document
    CALL insert_single_mem_meta(
        p_doc_mem_id,
        p_doc_content,
        p_doc_embed_vector,
        p_doc_tokens,
        p_doc_meta_id,
        p_doc_kind,
        FALSE, -- Assuming pinned is FALSE and priority is 0 for simplicity
        0,
        p_doc_role,
        p_doc_source
    );

    -- Call the basic insert procedure for the summary
    CALL insert_single_mem_meta(
        p_sum_mem_id,
        p_sum_content,
        p_sum_embed_vector,
        p_sum_tokens,
        p_sum_meta_id,
        p_sum_kind,
        FALSE, -- Assuming pinned is FALSE and priority is 0 for simplicity
        0,
        p_sum_role,
        p_sum_source
    );

    -- Update the meta records to link them
    UPDATE meta SET docId = p_doc_meta_id WHERE id = p_sum_meta_id;
    UPDATE meta SET summaryId = p_sum_meta_id WHERE id = p_doc_meta_id;
END;
$$;
