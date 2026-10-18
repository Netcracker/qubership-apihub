package view

type DocumentResult_deprecated struct {
	Ruleset           Ruleset           `json:"ruleset"`
	Issues            []ValidationIssue `json:"issues"`
	ValidatedDocument ValidatedDocument `json:"document"`
}

type DocumentResult struct {
	ValidatedDocument ValidatedDocument `json:"document"`
	Results           []LinterResult    `json:"results"`
}

type LinterResult struct {
	Linter  Linter            `json:"linter"`
	Ruleset Ruleset           `json:"ruleset"`
	Issues  []ValidationIssue `json:"issues"`
}

type ValidationIssue struct {
	Path     []string `json:"path,omitempty"`
	Code     string   `json:"code,omitempty"`
	Severity string   `json:"severity,omitempty"`
	Message  string   `json:"message,omitempty"`
}
