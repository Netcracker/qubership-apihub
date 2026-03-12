package entity

type BuildResultEntity struct {
	tableName struct{} `pg:"build_result"`

	BuildId string `pg:"build_id, pk, type:varchar"`
	Data    []byte `pg:"data, type:bytea"`
}
