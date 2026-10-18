package entity

type MigrationEntity struct {
	tableName struct{} `pg:"schema_migrations"`

	Version int  `pg:"version, pk, type:bigint"`
	Dirty   bool `pg:"dirty, type:boolean, use_zero"`
}
