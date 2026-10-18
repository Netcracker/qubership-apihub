package view

import "time"

type Ruleset struct {
	Id           string        `json:"id"`
	Name         string        `json:"name"`
	Status       RulesetStatus `json:"status"`
	FileName     string        `json:"fileName"`
	Linter       Linter        `json:"linter"`
	ApiType      ApiType       `json:"apiType"`
	CreatedAt    time.Time     `json:"createdAt"`
	CanBeDeleted bool          `json:"canBeDeleted"`
}

type RulesetStatus string

const (
	RulesetStatusActive   RulesetStatus = "active"
	RulesetStatusInactive RulesetStatus = "inactive"
)

type ActivationHistoryResponse struct {
	Id                string             `json:"id"`
	ActivationHistory []ActivationRecord `json:"activationHistory"`
}

type ActivationRecord struct {
	ActiveFrom time.Time  `json:"activeFrom"`
	ActiveTo   *time.Time `json:"activeTo,omitempty"`
}
