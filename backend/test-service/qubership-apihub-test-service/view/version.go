package view

import "time"

type VersionContent struct {
	PublishedAt              string                     `json:"publishedAt"`
	PublishedBy              string                     `json:"publishedBy"`
	PreviousVersion          string                     `json:"previousVersion"`
	PreviousVersionPackageId string                     `json:"previousVersionPackageId"`
	PreviousVersionStatus    string                     `json:"previousVersionStatus"`
	Summary                  VersionChangelogSummary    `json:"summary"`
	Refs                     []ReverencedPackageVersion `json:"refs"`
	Files                    []File                     `json:"files"`
}

type ReverencedPackageVersion struct {
	RefId   string `json:"refId"`
	Name    string `json:"name"`
	Version string `json:"version"`
	Status  string `json:"status"`
	Type    string `json:"type"`
}

type File struct {
	FieldId string   `json:"fieldId"`
	Slug    string   `json:"slug"`
	Type    string   `json:"type"`
	Format  string   `json:"format"`
	Title   string   `json:"title"`
	Labels  []string `json:"labels"`
}

type PublishedVersionListView struct {
	Version         string    `json:"version"`
	Status          string    `json:"status"`
	Folder          string    `json:"versionFolder"`
	CreatedAt       time.Time `json:"createdAt"`
	CreatedBy       string    `json:"createdBy"`
	PreviousVersion string    `json:"previousVersion"`
}

type PublishedVersionsView struct {
	Versions []PublishedVersionListView `json:"versions"`
}

type VersionChangelogSummary struct {
	Breaking     int `json:"breaking"`
	SemiBreaking int `json:"semiBreaking"`
	Deprecate    int `json:"deprecate"`
	NonBreaking  int `json:"nonBreaking"`
	Annotation   int `json:"annotation"`
	Unclassified int `json:"unclassified"`
}
