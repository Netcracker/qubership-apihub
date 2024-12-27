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

package repository

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type DraftRepository interface {
	CreateBranchDraft(ent entity.BranchDraftEntity, contents []*entity.ContentDraftEntity, refs []entity.BranchRefDraftEntity) error
	DeleteBranchDraft(projectId string, branchName string) error
	CreateContent(content *entity.ContentDraftEntity) error
	SetContents(contents []*entity.ContentDraftEntity) error
	GetContent(projectId string, branchName string, fileId string) (*entity.ContentDraftEntity, error)
	GetContentWithData(projectId string, branchName string, fileId string) (*entity.ContentDraftEntity, error)
	UpdateContent(content *entity.ContentDraftEntity) error
	UpdateContentMetadata(content *entity.ContentDraftEntity) error
	UpdateContents(contents []*entity.ContentDraftEntity) error
	UpdateContentsMetadata(contents []*entity.ContentDraftEntity) error
	UpdateContentsConflicts(projectId string, branchName string, fileConflicts []view.FileConflict) error
	UpdateContentData(projectId string, branchName string, fileId string, data []byte, mediaType string, status string, blobId string) error
	UpdateContentStatus(projectId string, branchName string, fileId string, status string, lastStatus string) error
	DeleteContent(projectId string, branchName string, fileId string) error
	ReplaceContent(projectId string, branchName string, oldFileId string, newContent *entity.ContentDraftEntity) error
	ContentExists(projectId string, branchName string, fileId string) (bool, error)
	GetContents(projectId string, branchName string) ([]entity.ContentDraftEntity, error)

	CreateRef(ref *entity.BranchRefDraftEntity) error
	GetRef(projectId string, branchName string, refProjectId string, refVersion string) (*entity.BranchRefDraftEntity, error)
	DeleteRef(projectId string, branchName string, refProjectId string, refVersion string) error
	UpdateRef(ref *entity.BranchRefDraftEntity) error
	ReplaceRef(projectId string, branchName string, refProjectId string, refVersion string, ref *entity.BranchRefDraftEntity) error
	GetRefs(projectId string, branchName string) ([]entity.BranchRefDraftEntity, error)

	DraftExists(projectId string, branchName string) (bool, error)

	UpdateFolderContents(projectId string, branchName string, fileIdsToDelete []string, fileIdsToMoveInFolder []string, fileIdsToMoveFromFolder []string) error
}
