package view

type AiValidationIssue struct {
	Path     []string `json:"path" jsonschema:"description=parts of an exact element json path"`
	Code     string   `json:"code"`                                                    // TODO: enum??
	Severity string   `json:"severity" jsonschema:"enum=error,enum=warning,enum=info"` // TODO: need hint or not??
	Message  string   `json:"message"`
}

type AiValidationIssuesOutput struct {
	Issues []AiValidationIssue `json:"issues"`
}

type AiRuleset struct {
	Prompt string `yaml:"prompt"`
}
