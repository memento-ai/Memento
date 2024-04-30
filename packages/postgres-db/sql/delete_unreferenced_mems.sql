-- Delete mems that are not referenced by any meta
DELETE FROM mem
WHERE id NOT IN (
    SELECT memid
    FROM meta
);
