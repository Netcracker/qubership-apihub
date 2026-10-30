DROP TABLE IF EXISTS fts_mcp_search_text;
DROP TABLE IF EXISTS mcp_entity_data;
DROP TABLE IF EXISTS mcp_entities;
DROP TABLE IF EXISTS fts_ddl_search_text;
DROP TABLE IF EXISTS ddl_comparison;
DROP TABLE IF EXISTS ddl_table_data;
DROP TABLE IF EXISTS ddl_tables;
ALTER TABLE version_comparison DROP COLUMN IF EXISTS contract_types;
