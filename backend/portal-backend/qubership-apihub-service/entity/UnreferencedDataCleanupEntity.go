package entity

import "time"

type UnreferencedDataCleanupEntity struct {
	tableName struct{} `pg:"unreferenced_data_cleanup_run"`

	RunId        string              `pg:"run_id, pk, type:uuid"`
	InstanceId   string              `pg:"instance_id, type:uuid"`
	StartedAt    time.Time           `pg:"started_at, type:timestamp without time zone"`
	FinishedAt   *time.Time          `pg:"finished_at, type:timestamp without time zone"`
	Status       string              `pg:"status, type:varchar"`
	Details      string              `pg:"details, type:varchar"`
	DeletedItems *DeletedItemsCounts `pg:"deleted_items, type:jsonb"`
}

type DeletedItemsCounts struct {
	OperationData                  int `json:"operationData"`
	TSRestOperationData            int `json:"tsRestOperationData"`
	TSOperationData                int `json:"tsOperationData"`
	FTSOperationData               int `json:"ftsOperationData"`
	OperationGroupTemplate         int `json:"operationGroupTemplate"`
	PublishedSrcArchives           int `json:"publishedSrcArchives"`
	PublishedData                  int `json:"publishedData"`
	VersionInternalDocumentData    int `json:"versionInternalDocumentData"`
	ComparisonInternalDocumentData int `json:"comparisonInternalDocumentData"`
}
