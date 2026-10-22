package view

import "time"

type PublishedVersionListView struct {
	Version                  string                 `json:"version"`
	Status                   string                 `json:"status"`
	CreatedAt                time.Time              `json:"createdAt"`
	CreatedBy                map[string]interface{} `json:"createdBy"`
	VersionLabels            []string               `json:"versionLabels"`
	PreviousVersion          string                 `json:"previousVersion"`
	PreviousVersionPackageId string                 `json:"previousVersionPackageId,omitempty"`
	NotLatestRevision        bool                   `json:"notLatestRevision,omitempty"`
	ApiProcessorVersion      string                 `json:"apiProcessorVersion"`
	HasErrors                bool                   `json:"hasErrors"`
	ChangelogHasErrors       bool                   `json:"changelogHasErrors"`
}

type PublishedVersionsView struct {
	Versions []PublishedVersionListView `json:"versions"`
}
