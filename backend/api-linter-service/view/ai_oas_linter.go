package view

import (
	"encoding/json"
	"errors"
)

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

type AiDeduplicationRequest struct {
	Groups []AiDeduplicationGroup `json:"groups"`
}

// AiDeduplicationGroup holds issues that share one resolved path. Known issues are already established as unique;
// new issues are compared against them and against each other.
type AiDeduplicationGroup struct {
	Path  []string               `json:"path"`
	Known []AiDeduplicationIssue `json:"known"`
	New   []AiDeduplicationIssue `json:"new"`
}

type AiDeduplicationIssue struct {
	Id       int    `json:"id"`
	Code     string `json:"code"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

type AiDeduplicationOutput struct {
	Duplicates []AiDuplicatePair `json:"duplicates"`
}

type AiDuplicatePair struct {
	DuplicateId int `json:"duplicateId" jsonschema:"description=id of the 'new' issue that duplicates another issue"`
	KeptId      int `json:"keptId" jsonschema:"description=id of the earlier issue that is kept"`
}

// UnmarshalJSON rejects a pair with a missing or null 'duplicateId' or 'keptId', which would otherwise decode as issue 0.
func (p *AiDuplicatePair) UnmarshalJSON(data []byte) error {
	var raw struct {
		DuplicateId *int `json:"duplicateId"`
		KeptId      *int `json:"keptId"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	if raw.DuplicateId == nil || raw.KeptId == nil {
		return errors.New("duplicate pair must have integer 'duplicateId' and 'keptId'")
	}
	p.DuplicateId, p.KeptId = *raw.DuplicateId, *raw.KeptId
	return nil
}
