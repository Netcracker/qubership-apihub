package utils

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
)

// PartitionSlug returns a short, identifier-safe suffix for global_search partition table names.
func PartitionSlug(workspaceId string) string {
	sum := md5.Sum([]byte(workspaceId))
	return "p_" + hex.EncodeToString(sum[:])
}

// GlobalSearchOperationPartitionTable returns the relation name for a workspace operations FTS partition.
func GlobalSearchOperationPartitionTable(workspaceId string) string {
	return fmt.Sprintf("global_search.fts_operation_search_text_%s", PartitionSlug(workspaceId))
}

// GlobalSearchDdlPartitionTable returns the relation name for a workspace DDL FTS partition.
func GlobalSearchDdlPartitionTable(workspaceId string) string {
	return fmt.Sprintf("global_search.fts_ddl_search_text_%s", PartitionSlug(workspaceId))
}

// GlobalSearchMcpPartitionTable returns the relation name for a workspace MCP FTS partition.
func GlobalSearchMcpPartitionTable(workspaceId string) string {
	return fmt.Sprintf("global_search.fts_mcp_search_text_%s", PartitionSlug(workspaceId))
}
