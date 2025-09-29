package view

type DocumentResult struct {
	Ruleset           Ruleset           `json:"ruleset"`
	Issues            []ValidationIssue `json:"issues"`
	ValidatedDocument ValidatedDocument `json:"document"`
}

type ValidationIssue struct {
	Path     []string `json:"path,omitempty"`
	Code     string   `json:"code,omitempty"`
	Severity string   `json:"severity,omitempty"`
	Message  string   `json:"message,omitempty"`
}
