package view

import "time"

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
