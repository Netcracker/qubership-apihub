package view

import "time"

type VersionStatus string

const (
	VersionStatusDraft   VersionStatus = "draft"
	VersionStatusRelease VersionStatus = "release"
)

func (s VersionStatus) Valid() bool {
	switch s {
	case VersionStatusDraft, VersionStatusRelease:
		return true
	}
	return false
}

type LibraryVersionImportReq struct {
	Version string   `json:"version"`
	Labels  []string `json:"labels,omitempty"`
	// PreviousVersion is the version the comparison is computed against. Empty means the latest release of
	// the library.
	PreviousVersion string `json:"previousVersion,omitempty"`
}

type LibraryVersion struct {
	LibraryId       string                   `json:"libraryId"`
	Version         string                   `json:"version"`
	PreviousVersion string                   `json:"previousVersion,omitempty"`
	Status          VersionStatus            `json:"status"`
	Labels          []string                 `json:"labels,omitempty"`
	Metadata        map[string]interface{}   `json:"metadata,omitempty"`
	CreatedAt       time.Time                `json:"createdAt"`
	CreatedBy       string                   `json:"createdBy"`
	Statistics      LibraryVersionStatistics `json:"statistics"`
}

// LibraryVersionStatistics holds the totals of the classes the version declares, nested ones included.
type LibraryVersionStatistics struct {
	ClassCount          int `json:"classCount"`
	InterfaceCount      int `json:"interfaceCount"`
	EnumCount           int `json:"enumCount"`
	AnnotationTypeCount int `json:"annotationTypeCount"`
}

type LibraryVersions struct {
	Versions []LibraryVersion `json:"versions"`
}

type LibraryVersionListReq struct {
	Status     []VersionStatus
	TextFilter string
	Limit      int
	Page       int
}

// AvailableVersion is a version the registry has and this service has not imported yet.
type AvailableVersion struct {
	Version string `json:"version"`
}

type AvailableVersions struct {
	Versions []AvailableVersion `json:"versions"`
}

type AvailableVersionListReq struct {
	TextFilter string
	Limit      int
	Page       int
}

// Keys the service writes into LibraryVersion.Metadata so a caller polling a version can tell an
// import that is still running from one that failed.
const (
	VersionMetadataBuildId     = "buildId"
	VersionMetadataBuildStatus = "buildStatus"
	VersionMetadataBuildError  = "buildError"
)
