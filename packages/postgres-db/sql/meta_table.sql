-- The meta table is much like an index for all of the mem records.
-- It stores metadata about the mem records, such as their kind, source, etc.
-- The `memento` view joins the `meta` and `mem` tables to provide the logical view of the memento records.
-- The 'kind' column is a string that specifies the kind of mem record and is the desriminator key
-- for a discriminated union -- see mementoSchema.ts for the details.
-- By using a discriminated union, we can store all of the different kinds of memento records in the same table,
-- giving us much of the flexibility of a no-sql database while still using a relational database.
CREATE TABLE meta(
    id VARCHAR(21) PRIMARY KEY,   -- nanoid
    memid VARCHAR(24) REFERENCES mem(id),
    kind VARCHAR(4) NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    priority INT DEFAULT 0,    -- 0 is lowest priority. high priority is unbounded
    role VARCHAR(10),
    docid VARCHAR(24),
    source VARCHAR(128),
    summaryid VARCHAR(24),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
