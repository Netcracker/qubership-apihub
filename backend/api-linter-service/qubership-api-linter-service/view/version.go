package view

import "time"

type VersionContent struct {
	PublishedAt              time.Time               `json:"createdAt"`
	PublishedBy              map[string]interface{}  `json:"createdBy"`
	PreviousVersion          string                  `json:"previousVersion,omitempty"`
	PreviousVersionPackageId string                  `json:"previousVersionPackageId,omitempty"`
	VersionLabels            []string                `json:"versionLabels,omitempty"`
	Status                   string                  `json:"status"`
	OperationTypes           []VersionOperationType  `json:"operationTypes,omitempty"`
	PackageId                string                  `json:"packageId"`
	Version                  string                  `json:"version"`
	NotLatestRevision        bool                    `json:"notLatestRevision,omitempty"`
	RevisionsCount           int                     `json:"revisionsCount,omitempty"`
	OperationGroups          []VersionOperationGroup `json:"operationGroups,omitempty"`
	ApiProcessorVersion      string                  `json:"apiProcessorVersion"`
}

type VersionOperationType struct {
	ApiType                         string                  `json:"apiType"`
	OperationsCount                 *int                    `json:"operationsCount,omitempty"`
	DeprecatedCount                 *int                    `json:"deprecatedCount,omitempty"`
	NoBwcOperationsCount            *int                    `json:"noBwcOperationsCount,omitempty"`
	ChangesSummary                  *ChangeSummary          `json:"changesSummary,omitempty"`
	NumberOfImpactedOperations      *ChangeSummary          `json:"numberOfImpactedOperations,omitempty"`
	InternalAudienceOperationsCount *int                    `json:"internalAudienceOperationsCount,omitempty"`
	UnknownAudienceOperationsCount  *int                    `json:"unknownAudienceOperationsCount,omitempty"`
	ApiAudienceTransitions          []ApiAudienceTransition `json:"apiAudienceTransitions,omitempty"`
	Operations                      map[string]string       `json:"operations,omitempty"`
}

type ChangeSummary struct {
	Breaking     int `json:"breaking"`
	SemiBreaking int `json:"semi-breaking"`
	Deprecated   int `json:"deprecated"`
	NonBreaking  int `json:"non-breaking"`
	Annotation   int `json:"annotation"`
	Unclassified int `json:"unclassified"`
}

type ApiAudienceTransition struct {
	CurrentAudience  string `json:"currentAudience"`
	PreviousAudience string `json:"previousAudience"`
	OperationsCount  int    `json:"operationsCount"`
}

type VersionOperationGroup struct {
	GroupName              string `json:"groupName"`
	ApiType                string `json:"apiType"`
	Description            string `json:"description,omitempty"`
	IsPrefixGroup          bool   `json:"isPrefixGroup"`
	OperationsCount        int    `json:"operationsCount"`
	GhostOperationsCount   int    `json:"ghostOperationsCount,omitempty"`
	ExportTemplateFilename string `json:"exportTemplateFileName,omitempty"`
}

type ValidationSummaryForVersion struct {
	Status    LintedVersionStatus  `json:"status"`
	Details   string               `json:"details,omitempty"`
	Documents []ValidationDocument `json:"documents,omitempty"`
	Rulesets  []Ruleset            `json:"rulesets,omitempty"`
}

type ValidationDocument struct {
	Status        LintedDocumentStatus `json:"status"`
	Details       string               `json:"details,omitempty"`
	Slug          string               `json:"slug"`
	ApiType       ApiType              `json:"apiType"`
	DocumentName  string               `json:"documentName"`
	RulesetId     string               `json:"rulesetId"`
	IssuesSummary *IssuesSummary       `json:"issuesSummary,omitempty"`
}

type IssuesSummary struct {
	Error   int `json:"error"`
	Warning int `json:"warning"`
	Info    int `json:"info"`
}

type LintedVersionStatus string

const (
	VersionStatusInProgress LintedVersionStatus = "inProgress"
	VersionStatusSuccess    LintedVersionStatus = "success"
	VersionStatusFailed     LintedVersionStatus = "failed" //  TODO: SPEC: past tense vs present tense for success
)

func (i *IssuesSummary) Append(add IssuesSummary) {
	i.Error += add.Error
	i.Warning += add.Warning
	i.Info += add.Info
}
