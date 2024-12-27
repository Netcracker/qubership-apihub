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

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
)

type Content struct {
	FileId           string       `json:"fileId" validate:"required" msgpack:"fileId"`
	Name             string       `json:"name" msgpack:"name"`
	Type             ShortcutType `json:"type" msgpack:"type"`
	Path             string       `json:"path" msgpack:"path"`
	Publish          bool         `json:"publish" msgpack:"publish"`
	Status           FileStatus   `json:"status" msgpack:"status"`
	LastStatus       FileStatus   `json:"lastStatus,omitempty" msgpack:"lastStatus,omitempty"`
	MovedFrom        string       `json:"movedFrom,omitempty" msgpack:"movedFrom,omitempty"`
	BlobId           string       `json:"blobId,omitempty" msgpack:"blobId,omitempty"`
	ConflictedBlobId string       `json:"conflictedBlobId,omitempty" msgpack:"conflictedBlobId,omitempty"`
	ConflictedFileId string       `json:"conflictedFileId,omitempty" msgpack:"conflictedFileId,omitempty"`
	Labels           []string     `json:"labels,omitempty" msgpack:"labels,omitempty"`
	Title            string       `json:"title,omitempty" msgpack:"title,omitempty"`
	ChangeType       ChangeType   `json:"changeType,omitempty" msgpack:"changeType,omitempty"`
	Included         bool         `json:"-"` //true if file was imported from git
	FromFolder       bool         `json:"-"`
	IsFolder         bool         `json:"-"`
}

type ContentGitConfigView struct {
	FileId  string   `json:"fileId"`            // git file path
	Publish *bool    `json:"publish,omitempty"` //pointer because absence of flag != false
	Labels  []string `json:"labels,omitempty"`
}

func TransformContentToGitView(content Content) ContentGitConfigView {
	return ContentGitConfigView{
		FileId:  content.FileId,
		Publish: &content.Publish,
		Labels:  content.Labels,
	}
}

func TransformGitViewToContent(content ContentGitConfigView) Content {
	publish := true
	if content.Publish != nil {
		publish = *content.Publish
	}
	labels := make([]string, 0)
	if content.Labels != nil {
		labels = content.Labels
	}
	fileId := utils.NormalizeFileId(content.FileId)
	filePath, fileName := utils.SplitFileId(fileId)
	return Content{
		FileId:  fileId,
		Name:    fileName,
		Type:    Unknown,
		Path:    filePath,
		Publish: publish,
		Status:  StatusUnmodified,
		Labels:  labels,
	}
}

type ContentAddResponse struct {
	FileIds []string `json:"fileIds"`
}

func (c *Content) EqualsGitView(c2 *Content) bool {
	return c.FileId == c2.FileId && c.Publish == c2.Publish && equalStringSets(c.Labels, c2.Labels)
}

func equalStringSets(first []string, second []string) bool {
	if len(first) != len(second) {
		return false
	}
	exists := make(map[string]bool)
	for _, value := range first {
		exists[value] = true
	}
	for _, value := range second {
		if !exists[value] {
			return false
		}
	}
	return true
}
