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
