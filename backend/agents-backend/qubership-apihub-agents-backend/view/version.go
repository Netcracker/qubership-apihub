package view

import "time"

type VersionStatus string

const DraftStatus VersionStatus = "draft"

const VersionSortByCreatedAt = "createdAt"

const VersionSortOrderDesc = "desc"

type ApiType string

const RestApiType ApiType = "rest"
const GraphqlApiType ApiType = "graphql"
const ProtobufApiType ApiType = "protobuf"

type VersionContent struct {
	PublishedAt              time.Time              `json:"createdAt"`
	PublishedBy              VersionCreatedBy       `json:"createdBy"`
	PreviousVersion          string                 `json:"previousVersion,omitempty"`
	PreviousVersionPackageId string                 `json:"previousVersionPackageId,omitempty"`
	VersionLabels            []string               `json:"versionLabels,omitempty"`
	Status                   string                 `json:"status"`
	ApiTypes                 []string               `json:"apiTypes,omitempty"`
	ChangeSummary            *ChangeSummary         `json:"changeSummary,omitempty"`
	OperationTypes           []VersionOperationType `json:"operationTypes,omitempty"`
	PackageId                string                 `json:"packageId"`
	Version                  string                 `json:"version"`
	NotLatestRevision        bool                   `json:"notLatestRevision,omitempty"`
}

type VersionCreatedBy struct {
	Type      string `json:"type"`
	Id        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarUrl string `json:"avatarUrl"`
}

type ChangeSummary struct {
	Breaking     int `json:"breaking"`
	SemiBreaking int `json:"semi-breaking"`
	Deprecated   int `json:"deprecated"`
	NonBreaking  int `json:"non-breaking"`
	Annotation   int `json:"annotation"`
	Unclassified int `json:"unclassified"`
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

type ApiAudienceTransition struct {
	CurrentAudience  string `json:"currentAudience"`
	PreviousAudience string `json:"previousAudience"`
	OperationsCount  int    `json:"operationsCount"`
}

type VersionSearchRequest struct {
	CheckRevisions bool
	TextFilter     string
	SortBy         string
	SortOrder      string
	VersionLabel   string
	Status         string
	Page           int
	Limit          int
}

type PublishedVersionListView struct {
	Version           string           `json:"version"`
	Status            string           `json:"status"`
	CreatedBy         VersionCreatedBy `json:"createdBy"`
	CreatedAt         time.Time        `json:"createdAt"`
	VersionLabels     []string         `json:"versionLabels"`
	PreviousVersion   string           `json:"previousVersion"`
	NotLatestRevision bool             `json:"notLatestRevision,omitempty"`
}

type PublishedVersionsView struct {
	Versions []PublishedVersionListView `json:"versions"`
}

type VersionReferences struct {
	References []VersionReference           `json:"references"`
	Packages   map[string]PackageVersionRef `json:"packages,omitempty"`
}

type VersionReference struct {
	PackageRef       string `json:"packageRef"`
	ParentPackageRef string `json:"parentPackageRef,omitempty"`
	Excluded         bool   `json:"excluded,omitempty"`
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

type DeleteVersionsRecursivelyReq struct {
	OlderThanDate time.Time `json:"olderThanDate"`
}

type DeleteVersionsRecursiveResponse struct {
	JobId string `json:"jobId"`
}
