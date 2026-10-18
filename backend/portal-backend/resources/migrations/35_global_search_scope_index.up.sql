-- Global search scopes results to packages and their subtrees, i.e. matches package_id
-- by prefix ('parent.'). A prefix range scan requires byte-ordered keys: under a non-C
-- database collation, ids sharing a prefix are not contiguous in the index (punctuation
-- such as '.' has low collation weight), so a default-opclass index cannot serve a prefix
-- range and the result would depend on the locale the cluster was created with.
-- varchar_pattern_ops sorts package_id by bytes regardless of locale; it is queried with
-- the byte-wise operators =, ~>=~, ~<~ (see GlobalSearchForOperations) because plain >=/<
-- belong to the collation operator family and cannot use this index.
CREATE INDEX IF NOT EXISTS fts_operation_search_text_scope_idx
    ON fts_operation_search_text (status, api_type, package_id varchar_pattern_ops);
