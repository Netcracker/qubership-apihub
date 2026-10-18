package entity

type BuildByStatusCountEntity struct {
	tableName  struct{} `pg:"build"`
	BuildCount int      `pg:"build_count, type:integer"`
}

type BuildTimeMetricsEntity struct {
	tableName    struct{} `pg:"build"`
	MaxBuildTime int      `pg:"max_build_time, type:integer"`
	AvgBuildTime int      `pg:"avg_build_time, type:integer"`
}

type BuildRetriesCountEntity struct {
	tableName    struct{} `pg:"build"`
	RetriesCount int      `pg:"retries_count, type:integer"`
}
