package entity

type LintFileResult struct {
	tableName struct{} `pg:"lint_file_result"`

	DataHash      string                 `pg:"data_hash,pk,type:varchar,notnull"`
	RulesetId     string                 `pg:"ruleset_id,pk,type:varchar,notnull"`
	LinterVersion string                 `pg:"linter_version,type:varchar,notnull"`
	Data          []byte                 `pg:"data,type:bytea,notnull"`
	Summary       map[string]interface{} `pg:"summary,type:jsonb,notnull"`
}

type LintFileResultSummary struct {
	tableName struct{} `pg:"lint_file_result"`

	DataHash      string                 `pg:"data_hash,pk,type:varchar,notnull"`
	RulesetId     string                 `pg:"ruleset_id,pk,type:varchar,notnull"`
	LinterVersion string                 `pg:"linter_version,type:varchar,notnull"`
	Summary       map[string]interface{} `pg:"summary,type:jsonb,notnull"`
}
