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

type FileStatus string

const (
	StatusAdded      FileStatus = "added"
	StatusIncluded   FileStatus = "included"
	StatusDeleted    FileStatus = "deleted"
	StatusExcluded   FileStatus = "excluded"
	StatusModified   FileStatus = "modified"
	StatusMoved      FileStatus = "moved"
	StatusUnmodified FileStatus = "unmodified"
)

func (f FileStatus) String() string {
	switch f {
	case StatusAdded:
		return "added"
	case StatusIncluded:
		return "included"
	case StatusDeleted:
		return "deleted"
	case StatusExcluded:
		return "excluded"
	case StatusModified:
		return "modified"
	case StatusMoved:
		return "moved"
	case StatusUnmodified:
		return "unmodified"
	default:
		return ""
	}

}

func ParseFileStatus(s string) FileStatus {
	switch s {
	case "added":
		return StatusAdded
	case "included":
		return StatusIncluded
	case "deleted":
		return StatusDeleted
	case "excluded":
		return StatusExcluded
	case "modified":
		return StatusModified
	case "moved":
		return StatusMoved
	case "unmodified":
		return StatusUnmodified
	default:
		return ""
	}
}
