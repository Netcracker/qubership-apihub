package view

type MigrationRequest struct {
	PackageIds           []string `json:"packageIds,omitempty"`
	Versions             []string `json:"versions,omitempty"`
	RebuildChangelogOnly bool     `json:"rebuildChangelogOnly"`
	SkipValidation       bool     `json:"skipValidation"`
}
