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
