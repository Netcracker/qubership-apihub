// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package view

import "time"

type PublishedVersion struct {
	PackageId                string             `json:"-"`
	Version                  string             `json:"-"`
	Status                   VersionStatus      `json:"status"`
	PublishedAt              time.Time          `json:"publishedAt"`
	PreviousVersion          string             `json:"previousVersion"`
	PreviousVersionPackageId string             `json:"previousVersionPackageId,omitempty"`
	Changes                  Validation         `json:"changes,omitempty"`
	Validations              ValidationsMap     `json:"validations,omitempty"`
	DeletedAt                *time.Time         `json:"-"`
	RelatedPackages          []PublishedRef     `json:"refs"`
	Contents                 []PublishedContent `json:"files"`
	Revision                 int                `json:"-"`
	BranchName               string             `json:"-"`
	VersionLabels            []string           `json:"versionLabels"`
}

type PublishedShortVersion struct {
	PackageId   string        `json:"-"`
	Version     string        `json:"-"`
	Status      VersionStatus `json:"status"`
	PublishedAt time.Time     `json:"publishedAt"`
}

type PublishedVersionListView_deprecated struct {
	Version                  string        `json:"version"`
	Status                   VersionStatus `json:"status"`
	PublishedAt              time.Time     `json:"publishedAt"`
	PreviousVersion          string        `json:"previousVersion"`
	PreviousVersionPackageId string        `json:"previousVersionPackageId,omitempty"`
	Revision                 int           `json:"revision"`
}

type PublishedVersions struct {
	Versions []PublishedVersion `json:"versions"`
}

type PublishedVersionsView_deprecated struct {
	Versions []PublishedVersionListView_deprecated `json:"versions"`
}

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
