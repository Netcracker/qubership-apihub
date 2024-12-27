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

package websocket

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

const (
	BranchConfigSnapshotType    = "branch:config:snapshot"
	BranchConfigUpdatedType     = "branch:config:updated"
	BranchFilesUpdatedType      = "branch:files:updated"
	BranchFilesResetType        = "branch:files:reset"
	BranchFilesDataModifiedType = "branch:files:data:modified"
	BranchRefsUpdatedType       = "branch:refs:updated"
	BranchSavedType             = "branch:saved"
	BranchResetType             = "branch:reset"
	BranchEditorAddedType       = "branch:editors:added"
	BranchEditorRemovedType     = "branch:editors:removed"
)

type BranchConfigSnapshot struct {
	Type string      `json:"type" msgpack:"type"`
	Data interface{} `json:"data" msgpack:"data"`
}

type BranchConfigUpdatedPatch struct {
	Type string                       `json:"type" msgpack:"type"`
	Data BranchConfigUpdatedPatchData `json:"data" msgpack:"data"`
}

type BranchConfigUpdatedPatchData struct {
	ChangeType view.ChangeType `json:"changeType" msgpack:"changeType"`
}

type BranchFilesUpdatedPatch struct {
	Type      string                       `json:"type"  msgpack:"type"`
	UserId    string                       `json:"userId"  msgpack:"userId"`
	Operation string                       `json:"operation"  msgpack:"operation"`
	FileId    string                       `json:"fileId,omitempty" msgpack:"fileId,omitempty"`
	Data      *BranchFilesUpdatedPatchData `json:"data,omitempty" msgpack:"data,omitempty"`
}

type BranchResetPatch struct {
	Type   string `json:"type" msgpack:"type"`
	UserId string `json:"userId" msgpack:"userId"`
}

type BranchFilesResetPatch struct {
	Type   string `json:"type" msgpack:"type"`
	UserId string `json:"userId" msgpack:"userId"`
	FileId string `json:"fileId" msgpack:"fileId"`
}

type BranchFilesUpdatedPatchData struct {
	FileId           string          `json:"fileId,omitempty" msgpack:"fileId,omitempty"`
	Publish          *bool           `json:"publish,omitempty" msgpack:"publish,omitempty"`
	Labels           *[]string       `json:"labels,omitempty" msgpack:"labels,omitempty"`
	Status           view.FileStatus `json:"status,omitempty" msgpack:"status,omitempty"`
	MovedFrom        *string         `json:"movedFrom,omitempty" msgpack:"movedFrom,omitempty"`
	ChangeType       view.ChangeType `json:"changeType,omitempty" msgpack:"changeType,omitempty"`
	BlobId           *string         `json:"blobId,omitempty" msgpack:"blobId,omitempty"`
	ConflictedBlobId *string         `json:"conflictedBlobId,omitempty" msgpack:"conflictedBlobId,omitempty"`
	ConflictedFileId *string         `json:"conflictedFileId,omitempty" msgpack:"conflictedFileId,omitempty"`
}

type BranchFilesDataModified struct {
	Type   string `json:"type" msgpack:"type"`
	UserId string `json:"userId" msgpack:"userId"`
	FileId string `json:"fileId" msgpack:"fileId"`
}

type BranchRefsUpdatedPatch struct {
	Type      string                      `json:"type" msgpack:"type"`
	UserId    string                      `json:"userId" msgpack:"userId"`
	Operation string                      `json:"operation" msgpack:"operation"`
	RefId     string                      `json:"refId,omitempty" msgpack:"refId,omitempty"`
	Version   string                      `json:"version,omitempty" msgpack:"version,omitempty"`
	Data      *BranchRefsUpdatedPatchData `json:"data,omitempty" msgpack:"data,omitempty"`
}

type BranchRefsUpdatedPatchData struct {
	RefId         string          `json:"refId,omitempty" msgpack:"refId,omitempty"`
	Version       string          `json:"version,omitempty" msgpack:"version,omitempty"`
	Name          string          `json:"name,omitempty" msgpack:"name,omitempty"`
	VersionStatus string          `json:"versionStatus,omitempty" msgpack:"versionStatus,omitempty"`
	Status        view.FileStatus `json:"status,omitempty" msgpack:"status,omitempty"`
}

type BranchSavedPatch struct {
	Type            string  `json:"type" msgpack:"type"`
	UserId          string  `json:"userId" msgpack:"userId"`
	Comment         string  `json:"comment" msgpack:"comment"`
	Branch          string  `json:"branch,omitempty" msgpack:",omitempty"`
	MergeRequestURL *string `json:"mrUrl,omitempty" msgpack:",omitempty"`
}

type BranchPublishedPatch struct {
	Type    string `json:"type" msgpack:"type"`
	UserId  string `json:"userId" msgpack:"userId"`
	Version string `json:"version" msgpack:"version"`
	Status  string `json:"status" msgpack:"status"`
}

type BranchEditorAddedPatch struct {
	Type   string `json:"type" msgpack:"type"`
	UserId string `json:"userId" msgpack:"userId"`
}

type BranchEditorRemovedPatch struct {
	Type   string `json:"type" msgpack:"type"`
	UserId string `json:"userId" msgpack:"userId"`
}
