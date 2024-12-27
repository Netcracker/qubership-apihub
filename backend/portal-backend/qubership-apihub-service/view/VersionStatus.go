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

import "fmt"

type VersionStatus string

const (
	Draft    VersionStatus = "draft"
	Release  VersionStatus = "release"
	Archived VersionStatus = "archived"
)

func (v VersionStatus) String() string {
	switch v {
	case Draft:
		return "draft"
	case Release:
		return "release"
	case Archived:
		return "archived"
	default:
		return ""
	}
}

func ParseVersionStatus(s string) (VersionStatus, error) {
	switch s {
	case "draft":
		return Draft, nil
	case "release":
		return Release, nil
	case "archived":
		return Archived, nil
	}
	return "", fmt.Errorf("unknown version status: %v", s)
}
