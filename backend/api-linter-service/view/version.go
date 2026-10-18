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
	ContractsSummary         *ContractsSummaryView   `json:"contractsSummary,omitempty"`
	HasErrors                bool                    `json:"hasErrors"`
	ChangelogHasErrors       bool                    `json:"changelogHasErrors"`
}

type ContractsSummaryView struct {
	DDL *DdlVersionContractSummary    `json:"ddl,omitempty"`
	MCP map[string]McpEndpointSummary `json:"mcp,omitempty"`
}

type DdlVersionContractSummary struct {
	TablesCount              int            `json:"tablesCount"`
	ChangesSummary           *ChangeSummary `json:"changesSummary,omitempty"`
	NumberOfImpactedEntities *ChangeSummary `json:"numberOfImpactedEntities,omitempty"`
	HasErrors                bool           `json:"hasErrors"`
}

type McpEndpointSummary struct {
	ToolsCount     int  `json:"toolsCount"`
	PromptsCount   int  `json:"promptsCount"`
	ResourcesCount int  `json:"resourcesCount"`
	HasErrors      bool `json:"hasErrors"`
}

type VersionOperationType struct {
	ApiType                         OpApiType               `json:"apiType"`
	OperationsCount                 *int                    `json:"operationsCount,omitempty"`
	DeprecatedCount                 *int                    `json:"deprecatedCount,omitempty"`
	NoBwcOperationsCount            *int                    `json:"noBwcOperationsCount,omitempty"`
	ChangesSummary                  *ChangeSummary          `json:"changesSummary,omitempty"`
	NumberOfImpactedOperations      *ChangeSummary          `json:"numberOfImpactedOperations,omitempty"`
	InternalAudienceOperationsCount *int                    `json:"internalAudienceOperationsCount,omitempty"`
	UnknownAudienceOperationsCount  *int                    `json:"unknownAudienceOperationsCount,omitempty"`
	ApiAudienceTransitions          []ApiAudienceTransition `json:"apiAudienceTransitions,omitempty"`
	Operations                      map[string]string       `json:"operations,omitempty"`
	HasErrors                       bool                    `json:"hasErrors"`
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
	Hint    int `json:"hint"`
}

type LintedVersionStatus string

const (
	VersionStatusInProgress LintedVersionStatus = "inProgress"
	VersionStatusSuccess    LintedVersionStatus = "success"
	VersionStatusError      LintedVersionStatus = "error"
)

func (i *IssuesSummary) Append(add IssuesSummary) {
	i.Error += add.Error
	i.Warning += add.Warning
	i.Info += add.Info
}

const (
	ApiAudienceInternal = "internal"
	ApiAudienceExternal = "external"
	ApiAudienceUnknown  = "unknown"
)

type VersionChangesView struct {
	PreviousVersion          string                             `json:"previousVersion"`
	PreviousVersionPackageId string                             `json:"previousVersionPackageId"`
	Operations               []OperationComparisonChangelogView `json:"operations"`
	Packages                 map[string]PackageVersionRef       `json:"packages,omitempty"`
}

type OperationComparisonChangelogView struct {
	CurrentOperation  *ComparisonOperationView `json:"currentOperation,omitempty"`
	PreviousOperation *ComparisonOperationView `json:"previousOperation,omitempty"`
	ChangeSummary     ChangeSummary            `json:"changeSummary"`
}

type PackageVersionRef struct {
	RefPackageId      string     `json:"refId"`
	Kind              string     `json:"kind"`
	RefPackageName    string     `json:"name"`
	RefPackageVersion string     `json:"version"`
	Status            string     `json:"status"`
	DeletedAt         *time.Time `json:"deletedAt,omitempty"`
	DeletedBy         string     `json:"deletedBy,omitempty"`
	ParentNames       []string   `json:"parentPackages,omitempty"`
	ServiceName       string     `json:"-"`
	NotLatestRevision bool       `json:"notLatestRevision,omitempty"`
}

type GenericComparisonOperationView struct {
	Title       string `json:"title"`
	ApiKind     string `json:"apiKind,omitempty"`
	ApiAudience string `json:"apiAudience"`
	DataHash    string `json:"dataHash,omitempty"`
	PackageRef  string `json:"packageRef"`
	OperationId string `json:"operationId"`
}

type ComparisonOperationView struct {
	GenericComparisonOperationView
}

type CompareVersionsReq struct {
	PackageId                string `json:"packageId" validate:"required"`
	Version                  string `json:"version" validate:"required"`
	PreviousVersion          string `json:"previousVersion" validate:"required"`
	PreviousVersionPackageId string `json:"previousVersionPackageId" validate:"required"`
}
