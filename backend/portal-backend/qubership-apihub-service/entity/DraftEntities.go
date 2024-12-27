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

package entity

import "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

type ContentDraftEntity struct {
	tableName struct{} `pg:"branch_draft_content"`

	ProjectId        string   `pg:"project_id, pk, type:varchar"`
	BranchName       string   `pg:"branch_name, pk, type:varchar"`
	FileId           string   `pg:"file_id, pk, type:varchar"`
	Index            int      `pg:"index, use_zero, type:integer"`
	Name             string   `pg:"name, type:varchar"`
	Path             string   `pg:"path, type:varchar"`
	Publish          bool     `pg:"publish, type:boolean, use_zero"`
	DataType         string   `pg:"data_type, type:varchar"`
	Data             []byte   `pg:"data, type:bytea"`
	MediaType        string   `pg:"media_type, type:varchar"`
	Status           string   `pg:"status, type:varchar"`
	LastStatus       string   `pg:"last_status, type:varchar"`
	ConflictedBlobId string   `pg:"conflicted_blob_id, type:varchar"`
	ConflictedFileId string   `pg:"conflicted_file_id, type:varchar"`
	MovedFrom        string   `pg:"moved_from, type:varchar"`
	BlobId           string   `pg:"blob_id, type:varchar"`
	Labels           []string `pg:"labels, array, type:varchar[]"`
	Included         bool     `pg:"included, type:boolean, use_zero"`
	FromFolder       bool     `pg:"from_folder, type:boolean, use_zero"`
	IsFolder         bool     `pg:"is_folder, type:boolean, use_zero"`
}

type BranchRefDraftEntity struct {
	tableName struct{} `pg:"branch_draft_reference"`

	ProjectId    string `pg:"project_id, pk, type:varchar"`
	BranchName   string `pg:"branch_name, pk, type:varchar"`
	RefPackageId string `pg:"reference_package_id, pk, type:varchar"`
	RefVersion   string `pg:"reference_version, pk, type:varchar"`
	Status       string `pg:"status, type:varchar"`
}

func MakeContentView(content *ContentDraftEntity) *view.Content {
	return &view.Content{
		FileId:           content.FileId,
		Name:             content.Name,
		Type:             view.ParseTypeFromString(content.DataType),
		Path:             content.Path,
		Publish:          content.Publish,
		Status:           view.ParseFileStatus(content.Status),
		LastStatus:       view.ParseFileStatus(content.LastStatus),
		ConflictedBlobId: content.ConflictedBlobId,
		ConflictedFileId: content.ConflictedFileId,
		MovedFrom:        content.MovedFrom,
		BlobId:           content.BlobId,
		Labels:           content.Labels,
		Included:         content.Included,
		FromFolder:       content.FromFolder,
		IsFolder:         content.IsFolder,
	}
}

func MakeContentDataView(content *ContentDraftEntity) *view.ContentData {
	return &view.ContentData{
		FileId:   content.FileId,
		Data:     content.Data,
		DataType: content.MediaType,
		BlobId:   content.BlobId,
	}
}

func MakeContentEntity(content *view.Content, index int, projectId string, branchName string, data []byte, mediaType string, status string) *ContentDraftEntity {
	var resData []byte
	if data != nil {
		resData = data
	}

	return &ContentDraftEntity{
		ProjectId:        projectId,
		BranchName:       branchName,
		FileId:           content.FileId,
		Index:            index,
		Name:             content.Name,
		Path:             content.Path,
		Publish:          content.Publish,
		DataType:         string(content.Type),
		Data:             resData,
		MediaType:        mediaType,
		Status:           status,
		LastStatus:       string(content.LastStatus),
		ConflictedBlobId: content.ConflictedBlobId,
		ConflictedFileId: content.ConflictedFileId,
		MovedFrom:        content.MovedFrom,
		BlobId:           content.BlobId,
		Labels:           content.Labels,
		Included:         content.Included,
		FromFolder:       content.FromFolder,
		IsFolder:         content.IsFolder,
	}
}

func MakeRefEntity(ref *view.Ref, projectId string, branchName string, status string) *BranchRefDraftEntity {
	return &BranchRefDraftEntity{
		ProjectId:    projectId,
		BranchName:   branchName,
		RefPackageId: ref.RefPackageId,
		RefVersion:   ref.RefPackageVersion,
		Status:       status,
	}
}

func MakeRefView(ref *BranchRefDraftEntity, refPackageName string, versionStatus string, kind string, isBroken bool) *view.Ref {
	return &view.Ref{
		RefPackageId:      ref.RefPackageId,
		RefPackageVersion: ref.RefVersion,
		RefPackageName:    refPackageName,
		VersionStatus:     versionStatus,
		Kind:              kind,
		Status:            view.ParseFileStatus(ref.Status),
		IsBroken:          isBroken,
	}
}
