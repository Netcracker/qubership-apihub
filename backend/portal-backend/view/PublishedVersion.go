package view

import "time"

type PublishedVersionHistoryView struct {
	PackageId                string    `json:"packageId"`
	Version                  string    `json:"version"`
	Revision                 int       `json:"revision"`
	Status                   string    `json:"status"`
	PreviousVersionPackageId string    `json:"previousVersionPackageId"`
	PreviousVersion          string    `json:"previousVersion"`
	PublishedAt              time.Time `json:"publishedAt"`
	ApiTypes                 []string  `json:"apiTypes"`
}

type PublishedVersionHistoryFilter struct {
	PublishedAfter  *time.Time
	PublishedBefore *time.Time
	Status          *string
	Limit           int
	Page            int
}
