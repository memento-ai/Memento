SELECT id as metaId, tokens, content
FROM memento
WHERE kind = 'csum'
ORDER BY pinned DESC NULLS LAST, priority DESC;
