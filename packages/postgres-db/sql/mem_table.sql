-- Description: Create table for storing 'mem' records
-- A mem is any piece of text content that we want to store and be searchable
--    via either semantic search (embeddings) or full-text search (tsvector).
-- All of the colums are computed from the content column.
-- The primary key `id` is a string md4 hash of the content.
-- The `content` column stores the actual text content.
-- The `embed_vector` is the embeddings vector for the content. We use
--    nomic-embed-text which has a maximum sequence length of 8192 tokens,
--    and produces a 768-dimensional vector.
--    When we store content longer than 8192 tokens, we truncate it.
-- The `tssearch` column is a tsvector column that is automatically generated
--    by postgresql from the content.
-- The `tokens` column stores the number of tokens in the content.
--    The number of tokens is the true length of the content, even if the content
--    is truncated for computing the embeddings.
CREATE TABLE mem(
    id VARCHAR(24) PRIMARY KEY,     -- string md4 hash of content
    content TEXT NOT NULL,
    embed_vector vector(768) NOT NULL,
    tssearch tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    tokens INT NOT NULL);
