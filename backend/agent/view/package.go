package view

type SimplePackage struct {
	Id                    string              `json:"packageId"`
	Alias                 string              `json:"alias" validate:"required"`
	ParentId              string              `json:"parentId"`
	Kind                  string              `json:"kind" validate:"required"`
	Name                  string              `json:"name" validate:"required"`
	Description           string              `json:"description"`
	IsFavorite            bool                `json:"isFavorite"`
	ServiceName           string              `json:"serviceName,omitempty"`
	ImageUrl              string              `json:"imageUrl"`
	Parents               []ParentPackageInfo `json:"parents"`
	DefaultRole           string              `json:"defaultRole"`
	UserRole              string              `json:"userRole"`
	DefaultReleaseVersion string              `json:"defaultReleaseVersion"`
}

type SimplePackages struct {
	Packages []SimplePackage `json:"packages"`
}

type ParentPackageInfo struct {
	Id       string `json:"packageId"`
	Alias    string `json:"alias"`
	ParentId string `json:"parentId"`
	Kind     string `json:"kind"`
	Name     string `json:"name"`
	ImageUrl string `json:"imageUrl"`
}

type AvailablePackagePromoteStatuses map[string][]string // map[packageId][]version status

type PackagesReq struct {
	Packages []string `json:"packages"`
}

const DefaultWorkspaceId = "QS"
