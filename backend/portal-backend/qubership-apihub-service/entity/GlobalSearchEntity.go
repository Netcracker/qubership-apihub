package entity

import "time"

type GlobalSearchWorkspaceRegistryEntity struct {
	tableName struct{} `pg:"global_search.workspace_registry"`

	WorkspaceId    string    `pg:"workspace_id, pk, type:varchar"`
	PartitionSlug  string    `pg:"partition_slug, type:varchar"`
	CreatedAt      time.Time `pg:"created_at, type:timestamptz"`
}

type GlobalSearchOperationSearchTextEntity struct {
	tableName struct{} `pg:"global_search.fts_operation_search_text"`

	WorkspaceId    string `pg:"workspace_id, type:varchar"`
	PackageId      string `pg:"package_id, type:varchar"`
	Version        string `pg:"version, type:varchar"`
	Revision       int    `pg:"revision, type:integer"`
	OperationId    string `pg:"operation_id, type:varchar"`
	Status         string `pg:"status, type:varchar"`
	ApiType        string `pg:"api_type, type:varchar"`
	SearchDataHash string `pg:"search_data_hash, type:varchar"`
}
