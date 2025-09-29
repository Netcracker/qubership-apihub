package entity

type SchemaMigrationEntity struct {
	tableName struct{} `pg:"stored_schema_migration, alias:stored_schema_migration"`

	Num      int    `pg:"num, pk, type:integer"`
	UpHash   string `pg:"up_hash, type:varchar"`
	SqlUp    string `pg:"sql_up, type:varchar"`
	DownHash string `pg:"down_hash, type:varchar"`
	SqlDown  string `pg:"sql_down, type:varchar"`
}

type MigrationEntity struct {
	tableName struct{} `pg:"schema_migrations"`

	Version int  `pg:"version, pk, type:bigint"`
	Dirty   bool `pg:"dirty, type:boolean, use_zero"`
}
