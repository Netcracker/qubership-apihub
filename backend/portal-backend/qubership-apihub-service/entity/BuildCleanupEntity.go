package entity

import "time"

type BuildCleanupEntity struct {
	tableName struct{} `pg:"build_cleanup_run"`

	RunId       int       `pg:"run_id, pk, type:integer"`
	DeletedRows int       `pg:"deleted_rows, type:integer"`
	ScheduledAt time.Time `pg:"scheduled_at, type:timestamp without time zone"`

	BuildResult         int `pg:"build_result, type:integer"`
	BuildSrc            int `pg:"build_src, type:integer"`
	OperationData       int `pg:"operation_data, type:integer"`
	TsOperationData     int `pg:"ts_operation_data, type:integer"`
	TsRestOperationData int `pg:"ts_rest_operation_data, type:integer"`
	TsGQLOperationData  int `pg:"ts_gql_operation_data, type:integer"`
}

type BuildIdEntity struct {
	tableName struct{} `pg:"build"`

	Id string `pg:"build_id, type:varchar"`
}
