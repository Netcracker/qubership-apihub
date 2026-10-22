package view

type VersionScore struct {
	Status                       ScoringStatus                              `json:"status"`
	Reasons                      []string                                   `json:"reason"`
	Debug                        []string                                   `json:"debug"`
	PublicationIntegrityDetails  *PublicationIntegrityDetails               `json:"publicationIntegrityDetails,omitempty"`
	BackwardCompatibilityDetails map[OpApiType]BackwardCompatibilityDetails `json:"backwardsCompatibilityDetails"`
	QualityCheckDetails          map[OpApiType][]QualityCheckDetails        `json:"qualityCheckDetails"`
}
type ScoringStatus string

const (
	ScoringPassed            ScoringStatus = "passed"
	ScoringPassedWithDefects ScoringStatus = "passed_with_defects"
	ScoringNotPassed         ScoringStatus = "not_passed"
)

type BackwardCompatibilityDetails struct {
	Status ScoringStatus `json:"status"`
	Reason string        `json:"reason"`

	// breaking changes
	Breaking int `json:"breaking"`

	// Issues for audience
	BreakingInternal int `json:"breakingInternal"`
	BreakingExternal int `json:"breakingExternal"`
	BreakingUnknown  int `json:"breakingUnknown"`

	// Audience transition
	Internal2Unknown  int `json:"internal2Unknown"`
	External2Internal int `json:"external2Internal"`
	External2Unknown  int `json:"external2Unknown"`
}

type QualityCheckDetails struct {
	Linter        Linter        `json:"linter"`
	Status        ScoringStatus `json:"status"`
	Optional      bool          `json:"optional"`
	Reason        string        `json:"reason"`
	ErrorsCount   int           `json:"errorsCount"`
	WarningsCount int           `json:"warningsCount"`
	InternalError string        `json:"internalErrors,omitempty"`
}

type PublicationIntegrityDetails struct {
	Status             ScoringStatus                      `json:"status"`
	Reason             string                             `json:"reason,omitempty"`
	HasErrors          bool                               `json:"hasErrors"`
	ChangelogHasErrors bool                               `json:"changelogHasErrors"`
	ApiTypes           map[OpApiType]PublicationErrorFlag `json:"apiTypes,omitempty"`
	Contracts          *PublicationContractsDetails       `json:"contracts,omitempty"`
}

type PublicationErrorFlag struct {
	HasErrors bool   `json:"hasErrors"`
	Reason    string `json:"reason,omitempty"`
}

type PublicationContractsDetails struct {
	DDL *PublicationErrorFlag `json:"ddl,omitempty"`
	MCP *PublicationErrorFlag `json:"mcp,omitempty"`
}
