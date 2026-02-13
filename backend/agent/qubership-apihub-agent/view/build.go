package view

type BuildConfig struct {
	PackageId                string   `json:"packageId"`
	Version                  string   `json:"version"`
	PreviousVersion          string   `json:"previousVersion,omitempty"`
	PreviousVersionPackageId string   `json:"previousVersionPackageId,omitempty"`
	Status                   string   `json:"status"`
	VersionFolder            string   `json:"versionFolder"`
	Refs                     []BCRef  `json:"refs"`
	Files                    []BCFile `json:"files"`
	PublishId                string   `json:"publishId"`
	ServiceId                string   `json:"serviceId"`
	VersionLabels            []string `json:"versionLabels"`
	ApihubPackageUrl         string   `json:"apihubPackageUrl"` // Required for FE only in case of promote
	CreatedBy                string   `json:"createdBy"`
}

type GroupBuildConfig struct {
	PackageId string `json:"packageId"`
	PublishId string `json:"publishId"`
}

type BCRef struct {
	RefId   string `json:"refId"`
	Version string `json:"version"`
	// TODO: RelationType?
}

type BCFile struct {
	FileId   string   `json:"fileId"`
	Publish  bool     `json:"publish"`
	Labels   []string `json:"labels"`
	XApiKind string   `json:"xApiKind,omitempty"`
}

type PublishStatusResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}
