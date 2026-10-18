package view

import "time"

type SimplePackage struct {
	Id                    string              `json:"packageId"`
	Alias                 string              `json:"alias"`
	ParentId              string              `json:"parentId"`
	Kind                  string              `json:"kind"`
	Name                  string              `json:"name"`
	Description           string              `json:"description"`
	IsFavorite            bool                `json:"isFavorite"`
	ServiceName           string              `json:"serviceName,omitempty"`
	ImageUrl              string              `json:"imageUrl"`
	Parents               []ParentPackageInfo `json:"parents"`
	UserRole              string              `json:"userRole"`
	DefaultRole           string              `json:"defaultRole"`
	DeletionDate          *time.Time          `json:"-"`
	DeletedBy             string              `json:"-"`
	CreatedBy             string              `json:"-"`
	CreatedAt             time.Time           `json:"createdAt,omitempty"`
	ReleaseVersionPattern string              `json:"releaseVersionPattern"`
	DefaultReleaseVersion string              `json:"defaultReleaseVersion"`
}

type ParentPackageInfo struct {
	Id       string `json:"packageId"`
	Alias    string `json:"alias"`
	ParentId string `json:"parentId"`
	Kind     string `json:"kind"`
	Name     string `json:"name"`
	ImageUrl string `json:"imageUrl"`
}

type PackageKind string

const KindPackage PackageKind = "package"
const KindDashbord PackageKind = "dashboard"
const KindWorkspace PackageKind = "workspace"
const KindGroup PackageKind = "group"

type PackageListReq struct {
	TextFilter                string
	ParentID                  string
	Kind                      []string
	OnlyFavorite              *bool
	OnlyShared                *bool
	ShowParents               *bool
	LastReleaseVersionDetails *bool
	Limit                     *int
	Page                      *int
	ServiceName               string
	ShowAllDescendants        *bool
}

type Packages struct {
	Packages []PackagesInfo `json:"packages"`
}

type PackagesInfo struct {
	Id                        string              `json:"packageId"`
	Alias                     string              `json:"alias"`
	ParentId                  string              `json:"parentId"`
	Kind                      string              `json:"kind"`
	Name                      string              `json:"name"`
	Description               string              `json:"description"`
	IsFavorite                bool                `json:"isFavorite,omitempty"`
	ServiceName               string              `json:"serviceName,omitempty"`
	Parents                   []ParentPackageInfo `json:"parents"`
	DefaultRole               string              `json:"defaultRole"`
	UserPermissions           []string            `json:"permissions,omitempty"`
	LastReleaseVersionDetails *VersionDetails     `json:"lastReleaseVersionDetails,omitempty"`
	RestGroupingPrefix        string              `json:"restGroupingPrefix,omitempty"`
	ReleaseVersionPattern     string              `json:"releaseVersionPattern,omitempty"`
	CreatedAt                 time.Time           `json:"createdAt,omitempty"`
	DeletedAt                 *time.Time          `json:"deletedAt,omitempty"`
}

type VersionDetails struct {
	Version           string         `json:"version"`
	NotLatestRevision bool           `json:"notLatestRevision,omitempty"`
	Summary           *ChangeSummary `json:"summary,omitempty"`
}
