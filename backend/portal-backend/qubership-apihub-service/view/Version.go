package view

import (
	"time"
)

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

type VersionDocuments struct {
	Documents []PublishedDocumentRefView   `json:"documents"`
	Packages  map[string]PackageVersionRef `json:"packages,omitempty"`
}

type VersionReferencesV3 struct {
	References []VersionReferenceV3         `json:"references"`
	Packages   map[string]PackageVersionRef `json:"packages,omitempty"`
}

type VersionReferenceV3 struct {
	PackageRef       string `json:"packageRef"`
	ParentPackageRef string `json:"parentPackageRef,omitempty"`
	Excluded         bool   `json:"excluded,omitempty"`
}

type PublishedVersionListView struct {
	Version                  string                 `json:"version"`
	Status                   string                 `json:"status"`
	CreatedAt                time.Time              `json:"createdAt"`
	CreatedBy                map[string]interface{} `json:"createdBy"`
	VersionLabels            []string               `json:"versionLabels"`
	PreviousVersion          string                 `json:"previousVersion"`
	PreviousVersionPackageId string                 `json:"previousVersionPackageId,omitempty"`
	NotLatestRevision        bool                   `json:"notLatestRevision,omitempty"`
	ApiProcessorVersion      string                 `json:"apiProcessorVersion"`
}
type PublishedVersionsView struct {
	Versions []PublishedVersionListView `json:"versions"`
}

type SharedUrlResult struct {
	SharedFileId string `json:"sharedFileId"`
}

type SharedFilesReq struct {
	PackageId string `json:"packageId"`
	Version   string `json:"version"`
	Slug      string `json:"slug"`
}

type VersionPatchRequest struct {
	Status        *string   `json:"status"`
	VersionLabels *[]string `json:"versionLabels"`
}

type VersionListReq struct {
	PackageId      string
	Status         string
	Limit          int
	Page           int
	TextFilter     string
	Label          string
	CheckRevisions bool
	SortBy         string
	SortOrder      string
}

type CompareVersionsReq struct {
	PackageId                string `json:"packageId" validate:"required"`
	Version                  string `json:"version" validate:"required"`
	PreviousVersion          string `json:"previousVersion" validate:"required"`
	PreviousVersionPackageId string `json:"previousVersionPackageId" validate:"required"`
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

type PackageVersionRevisions struct {
	Revisions []PackageVersionRevision `json:"revisions"`
}

type PackageVersionRevision struct {
	Version           string                 `json:"version"`
	Revision          int                    `json:"revision"`
	Status            string                 `json:"status"`
	CreatedBy         map[string]interface{} `json:"createdBy"`
	CreatedAt         time.Time              `json:"createdAt"`
	RevisionLabels    []string               `json:"revisionLabels"`
	PublishMeta       BuildConfigMetadata    `json:"publishMeta"`
	NotLatestRevision bool                   `json:"notLatestRevision,omitempty"`
}

type DeleteVersionsRecursivelyReq struct {
	OlderThanDate time.Time `json:"olderThanDate"`
}

type CopyVersionReq struct {
	TargetPackageId                string   `json:"targetPackageId" validate:"required"`
	TargetVersion                  string   `json:"targetVersion" validate:"required"`
	TargetPreviousVersion          string   `json:"targetPreviousVersion"`
	TargetPreviousVersionPackageId string   `json:"targetPreviousVersionPackageId"`
	TargetStatus                   string   `json:"targetStatus" validate:"required"`
	TargetVersionLabels            []string `json:"targetVersionLabels"`
}

type CopyVersionResp struct {
	PublishId string `json:"publishId"`
}

const VersionSortOrderAsc = "asc"
const VersionSortOrderDesc = "desc"

const VersionSortByVersion = "version"
const VersionSortByCreatedAt = "createdAt"

type PublishFromCSVReq struct {
	PackageId                string   `json:"packageId" validate:"required"`
	Version                  string   `json:"version" validate:"required"`
	PreviousVersion          string   `json:"previousVersion"`
	PreviousVersionPackageId string   `json:"previousVersionPackageId"`
	Status                   string   `json:"status" validate:"required"`
	VersionLabels            []string `json:"versionLabels"`
	CSVData                  []byte   `json:"csvData"`
	ServicesWorkspaceId      string   `json:"servicesWorkspaceId" validate:"required"` //workspace for matching packages by serviceNames
}

type PublishFromCSVResp struct {
	PublishId string `json:"publishId"`
}

type CSVDashboardPublishStatusResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}
