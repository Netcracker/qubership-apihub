package view

type PackageExportConfigUpdate struct {
	AllowedOasExtensions []string `json:"allowedOasExtensions" validate:"required"`
}

type PackageExportConfig struct {
	AllowedOasExtensions []AllowedOASExtEnriched `json:"allowedOasExtensions"`
}

type AllowedOASExtEnriched struct {
	OasExtension string `json:"oasExtension"`
	PackageId    string `json:"packageId"`
	PackageName  string `json:"packageName"`
	PackageKind  string `json:"packageKind"`
}
