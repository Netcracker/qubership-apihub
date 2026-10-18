package view

type VersionValidationChanges_deprecated struct {
	PreviousVersion          string                            `json:"previousVersion,omitempty"`
	PreviousVersionPackageId string                            `json:"previousVersionPackageId,omitempty"`
	Changes                  []VersionChangelogData_deprecated `json:"changes"`
	Bwc                      []VersionBwcData_deprecated       `json:"bwcMessages"`
}

type VersionValidationProblems_deprecated struct {
	Spectral []VersionSpectralData_deprecated `json:"messages"`
}

// changelog.json
type VersionChangelog_deprecated struct {
	Summary VersionChangelogSummary_deprecated `json:"summary,omitempty"`
	Data    []VersionChangelogData_deprecated  `json:"data,omitempty"`
}

type VersionChangelogSummary_deprecated struct {
	Breaking     int `json:"breaking"`
	NonBreaking  int `json:"non-breaking"`
	Unclassified int `json:"unclassified"`
	SemiBreaking int `json:"semi-breaking"`
	Annotation   int `json:"annotation"`
	Deprecate    int `json:"deprecate"`
}

type VersionChangelogData_deprecated struct {
	FileId         string             `json:"fileId,omitempty"`
	Slug           string             `json:"slug,omitempty"`
	PreviousFileId string             `json:"previousFileId,omitempty"`
	PreviousSlug   string             `json:"previousSlug,omitempty"`
	Openapi        *OpenapiOperation  `json:"openapi,omitempty"`
	Asyncapi       *AsyncapiOperation `json:"asyncapi,omitempty"`
	JsonPath       []string           `json:"jsonPath,omitempty" validate:"required"`
	Action         string             `json:"action,omitempty" validate:"required"`
	Severity       string             `json:"severity,omitempty" validate:"required"`
}

// spectral.json
type VersionSpectral_deprecated struct {
	Summary VersionSpectralSummary_deprecated `json:"summary,omitempty"`
	Data    []VersionSpectralData_deprecated  `json:"data,omitempty"`
}

type VersionSpectralSummary_deprecated struct {
	Errors   int `json:"error"`
	Warnings int `json:"warnings"`
}

type VersionSpectralData_deprecated struct {
	FileId           string   `json:"fileId,omitempty"`
	Slug             string   `json:"slug,omitempty"`
	JsonPath         []string `json:"jsonPath,omitempty"`
	ExternalFilePath string   `json:"externalFilePath,omitempty"`
	Message          string   `json:"message" validate:"required"`
	Severity         int      `json:"severity" validate:"required"`
}

// bwc.json
type VersionBwc_deprecated struct {
	Summary VersionBwcSummary_deprecated `json:"summary,omitempty"`
	Data    []VersionBwcData_deprecated  `json:"data,omitempty"`
}

type VersionBwcSummary_deprecated struct {
	Errors   int `json:"error"`
	Warnings int `json:"warnings"`
}

type VersionBwcData_deprecated struct {
	FileId           string   `json:"fileId,omitempty"`
	PreviousFileId   string   `json:"previousFileId,omitempty"`
	Slug             string   `json:"slug,omitempty"`
	PreviousSlug     string   `json:"previousSlug,omitempty"`
	JsonPath         []string `json:"jsonPath,omitempty"`
	ExternalFilePath string   `json:"externalFilePath,omitempty"`
	Message          string   `json:"message" validate:"required"`
	Severity         int      `json:"severity" validate:"required"`
}
