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
	"context"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-pg/pg/v10"
)

func NewDraftRepositoryPG(cp db.ConnectionProvider) (DraftRepository, error) {
	return &draftRepositoryImpl{cp: cp}, nil
}

type draftRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (b draftRepositoryImpl) DeleteBranchDraft(projectId string, branchName string) error {
	err := b.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
		_, err := tx.Model(&entity.BranchDraftEntity{}).
			Where("project_id = ?", projectId).
			Where("branch_name = ?", branchName).
			Delete()
		if err != nil {
			return err
		}
		_, err = tx.Model(&entity.ContentDraftEntity{}).
			Where("project_id = ?", projectId).
			Where("branch_name = ?", branchName).
			Delete()
		if err != nil {
			return err
		}
		_, err = tx.Model(&entity.BranchRefDraftEntity{}).
			Where("project_id = ?", projectId).
			Where("branch_name = ?", branchName).
			Delete()
		return err
	})

	return err
}

func (d draftRepositoryImpl) CreateBranchDraft(ent entity.BranchDraftEntity, contents []*entity.ContentDraftEntity, refs []entity.BranchRefDraftEntity) error {
	err := d.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
		_, err := tx.Model(&ent).
			OnConflict("(project_id, branch_name) DO NOTHING").
			Insert()
		if err != nil {
			return err
		}
		if len(contents) > 0 {
			for _, content := range contents {
				_, err := tx.Model(content).
					OnConflict("(project_id, branch_name, file_id) DO NOTHING").
					Insert()
				if err != nil {
					return err
				}
			}
		}
		if len(refs) > 0 {
			_, err = tx.Model(&refs).
				OnConflict("(project_id, branch_name, reference_package_id, reference_version) DO NOTHING").
				Insert()
			if err != nil {
				return err
			}
		}

		if err != nil {
			return err
		}
		folders := make([]string, 0)
		files := make([]*entity.ContentDraftEntity, 0)
		excludedFiles := make([]string, 0)
		filesToMoveInFolder := make(map[string]bool, 0)
		filesToDelete := make(map[string]bool, 0)
		for index, file := range contents {
			if file.IsFolder {
				folders = append(folders, file.FileId)
			}
			if file.Status == string(view.StatusExcluded) {
				excludedFiles = append(excludedFiles, file.FileId)
			}
			if file.FromFolder || file.Publish || len(file.Labels) > 0 {
				continue
			}
			files = append(files, contents[index])
		}
		for _, folder := range folders {
			for _, file := range files {
				if strings.HasPrefix(file.FileId, folder) && file.FileId != folder {
					if file.IsFolder {
						filesToDelete[file.FileId] = true
					} else {
						filesToMoveInFolder[file.FileId] = true
					}
				}
			}
		}

		fileIdsToMoveInFolder := make([]string, 0)
		fileIdsToMoveFromFolder := make([]string, 0)
		fileIdsToDelete := make([]string, 0)
		for fileToUpdate := range filesToMoveInFolder {
			fileIdsToMoveInFolder = append(fileIdsToMoveInFolder, fileToUpdate)
		}
		for _, excludedFileId := range excludedFiles {
			folderForExcludedFile := findFolderForFileEnts(excludedFileId, contents)
			if folderForExcludedFile == "" {
				continue
			}
			fileIdsToMoveFromFolder = append(fileIdsToMoveFromFolder, findAllFilesForFolderEnts(folderForExcludedFile, contents)...)
			filesToDelete[folderForExcludedFile] = true
		}
		for fileToDelete := range filesToDelete {
			fileIdsToDelete = append(fileIdsToDelete, fileToDelete)
		}

		err = d.UpdateFolderContents(ent.ProjectId, ent.BranchName, fileIdsToDelete, fileIdsToMoveInFolder, fileIdsToMoveFromFolder)
		return err
	})
	return err
}

func (d draftRepositoryImpl) CreateContent(content *entity.ContentDraftEntity) error {
	_, err := d.cp.GetConnection().Model(content).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) SetContents(contents []*entity.ContentDraftEntity) error {
	if len(contents) == 0 {
		return nil
	}
	ctx := context.Background()
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, content := range contents {
			_, err := tx.Model(content).
				OnConflict("(project_id, branch_name, file_id) DO UPDATE").
				Insert()
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) GetContent(projectId string, branchName string, fileId string) (*entity.ContentDraftEntity, error) {
	result := new(entity.ContentDraftEntity)
	err := d.cp.GetConnection().Model(result).
		ExcludeColumn("data").
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Where("file_id = ?", fileId).
		Where("is_folder = false").
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (d draftRepositoryImpl) GetContentWithData(projectId string, branchName string, fileId string) (*entity.ContentDraftEntity, error) {
	result := new(entity.ContentDraftEntity)
	err := d.cp.GetConnection().Model(result).
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Where("file_id = ?", fileId).
		Where("is_folder = false").
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (d draftRepositoryImpl) UpdateContent(content *entity.ContentDraftEntity) error {
	_, err := d.cp.GetConnection().Model(content).
		Where("project_id = ?", content.ProjectId).
		Where("branch_name = ?", content.BranchName).
		Where("file_id = ?", content.FileId).
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) UpdateContentMetadata(content *entity.ContentDraftEntity) error {
	_, err := d.cp.GetConnection().Model(content).
		Column("publish", "labels", "from_folder").
		Where("project_id = ?", content.ProjectId).
		Where("branch_name = ?", content.BranchName).
		Where("file_id = ?", content.FileId).
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) UpdateContents(contents []*entity.ContentDraftEntity) error {

	ctx := context.Background()
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, content := range contents {
			_, err := tx.Model(content).
				Where("project_id = ?", content.ProjectId).
				Where("branch_name = ?", content.BranchName).
				Where("file_id = ?", content.FileId).
				Update()
			if err != nil {
				return err
			}

		}
		return nil
	})

	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) UpdateContentsMetadata(contents []*entity.ContentDraftEntity) error {

	ctx := context.Background()
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, content := range contents {
			_, err := tx.Model(content).
				Column("publish", "labels", "from_folder").
				Where("project_id = ?", content.ProjectId).
				Where("branch_name = ?", content.BranchName).
				Where("file_id = ?", content.FileId).
				Update()
			if err != nil {
				return err
			}

		}
		return nil
	})

	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) UpdateContentsConflicts(projectId string, branchName string, fileConflicts []view.FileConflict) error {
	ctx := context.Background()
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for _, conflict := range fileConflicts {
			contentEnt := &entity.ContentDraftEntity{ConflictedBlobId: conflict.ConflictedBlobId}
			if conflict.ConflictedFileId != nil {
				contentEnt.ConflictedFileId = *conflict.ConflictedFileId
			}
			_, err := tx.Model(contentEnt).
				Where("project_id = ?", projectId).
				Where("branch_name = ?", branchName).
				Where("file_id = ?", conflict.FileId).
				Set("conflicted_blob_id = ?conflicted_blob_id").
				Set("conflicted_file_id = ?conflicted_file_id").
				Update()
			if err != nil {
				return err
			}

		}
		return nil
	})

	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) UpdateContentData(projectId string, branchName string, fileId string, data []byte, mediaType string, status string, blobId string) error {
	_, err := d.cp.GetConnection().Model(&entity.ContentDraftEntity{Data: data, MediaType: mediaType, Status: status, BlobId: blobId}).
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Where("file_id = ?", fileId).
		Set("data = ?data").
		Set("media_type = ?media_type").
		Set("status = ?status").
		Set("blob_id = ?blob_id").
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) UpdateContentStatus(projectId string, branchName string, fileId string, status string, lastStatus string) error {
	_, err := d.cp.GetConnection().Model(&entity.ContentDraftEntity{Status: status, LastStatus: lastStatus}).
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Where("file_id = ?", fileId).
		Set("status = ?status").
		Set("last_status = ?last_status").
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) DeleteContent(projectId string, branchName string, fileId string) error {
	ctx := context.Background()
	return d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		return d.deleteContent(tx, projectId, branchName, fileId)
	})
}

func (d draftRepositoryImpl) deleteContent(tx *pg.Tx, projectId string, branchName string, fileId string) error {
	_, err := tx.Model(&entity.ContentDraftEntity{}).
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Where("file_id = ?", fileId).
		Delete()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil
		}
		return err
	}
	return nil
}

func (d draftRepositoryImpl) ReplaceContent(projectId string, branchName string, oldFileId string, newContent *entity.ContentDraftEntity) error {
	ctx := context.Background()
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		err := d.deleteContent(tx, projectId, branchName, oldFileId)
		if err != nil {
			return err
		}
		_, err = tx.Model(newContent).
			OnConflict("(project_id, branch_name, file_id) DO UPDATE").
			Insert()
		if err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) ContentExists(projectId string, branchName string, fileId string) (bool, error) {
	result := new(entity.ContentDraftEntity)
	err := d.cp.GetConnection().Model(result).
		Column("file_id").
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Where("file_id = ?", fileId).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (d draftRepositoryImpl) GetContents(projectId string, branchName string) ([]entity.ContentDraftEntity, error) {
	var result []entity.ContentDraftEntity

	err := d.cp.GetConnection().Model(&result).
		ExcludeColumn("data").
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Order("index ASC").
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (d draftRepositoryImpl) CreateRef(ref *entity.BranchRefDraftEntity) error {
	_, err := d.cp.GetConnection().Model(ref).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) GetRef(projectId string, branchName string, refProjectId string, refVersion string) (*entity.BranchRefDraftEntity, error) {
	result := new(entity.BranchRefDraftEntity)
	err := d.cp.GetConnection().Model(result).
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Where("reference_package_id = ?", refProjectId).
		Where("reference_version = ?", refVersion).
		First()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (d draftRepositoryImpl) DeleteRef(projectId string, branchName string, refProjectId string, refVersion string) error {
	ctx := context.Background()
	return d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		return d.deleteRef(tx, projectId, branchName, refProjectId, refVersion)
	})
}

func (d draftRepositoryImpl) deleteRef(tx *pg.Tx, projectId string, branchName string, refProjectId string, refVersion string) error {
	_, err := tx.Model(&entity.BranchRefDraftEntity{}).
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Where("reference_package_id = ?", refProjectId).
		Where("reference_version = ?", refVersion).
		Delete()
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) UpdateRef(ref *entity.BranchRefDraftEntity) error {
	_, err := d.cp.GetConnection().Model(ref).
		Where("project_id = ?", ref.ProjectId).
		Where("branch_name = ?", ref.BranchName).
		Where("reference_package_id = ?", ref.RefPackageId).
		Where("reference_version = ?", ref.RefVersion).
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) ReplaceRef(projectId string, branchName string, refProjectId string, refVersion string, ref *entity.BranchRefDraftEntity) error {
	ctx := context.Background()
	err := d.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		_, err := tx.Model(ref).Insert()
		if err != nil {
			return err
		}
		err = d.deleteRef(tx, projectId, branchName, refProjectId, refVersion)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (d draftRepositoryImpl) GetRefs(projectId string, branchName string) ([]entity.BranchRefDraftEntity, error) {
	var result []entity.BranchRefDraftEntity
	err := d.cp.GetConnection().Model(&result).
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Order("reference_version ASC").
		Select()
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (d draftRepositoryImpl) DraftExists(projectId string, branchName string) (bool, error) {
	contentCount, err := d.cp.GetConnection().Model(&entity.ContentDraftEntity{}).
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Count()
	if err != nil {
		return false, err
	}

	refCount, err := d.cp.GetConnection().Model(&entity.BranchRefDraftEntity{}).
		Where("project_id = ?", projectId).
		Where("branch_name = ?", branchName).
		Count()
	if err != nil {
		return false, err
	}

	if (contentCount + refCount) > 0 {
		return true, nil
	} else {
		return false, nil
	}
}

func findFolderForFileEnts(fileId string, allFiles []*entity.ContentDraftEntity) string {
	for _, file := range allFiles {
		if file.IsFolder && strings.HasPrefix(fileId, file.FileId) {
			return file.FileId
		}
	}
	return ""
}

func findAllFilesForFolderEnts(folderFileId string, allFiles []*entity.ContentDraftEntity) []string {
	filesForFolder := make([]string, 0)
	for _, file := range allFiles {
		if !file.IsFolder && file.FromFolder && strings.HasPrefix(file.FileId, folderFileId) {
			filesForFolder = append(filesForFolder, file.FileId)
		}
	}
	return filesForFolder
}

func (d draftRepositoryImpl) UpdateFolderContents(projectId string, branchName string, fileIdsToDelete []string, fileIdsToMoveInFolder []string, fileIdsToMoveFromFolder []string) error {
	err := d.cp.GetConnection().RunInTransaction(context.Background(), func(tx *pg.Tx) error {
		if len(fileIdsToDelete) > 0 {
			_, err := tx.Model(&entity.ContentDraftEntity{}).
				Where("project_id = ?", projectId).
				Where("branch_name = ?", branchName).
				Where("file_id in (?)", pg.In(fileIdsToDelete)).
				Delete()
			if err != nil {
				return err
			}
		}

		if len(fileIdsToMoveInFolder) > 0 {
			_, err := tx.Model(&entity.ContentDraftEntity{}).
				Where("project_id = ?", projectId).
				Where("branch_name = ?", branchName).
				Where("file_id in (?)", pg.In(fileIdsToMoveInFolder)).
				Set("from_folder = ?", true).
				Update()
			if err != nil {
				return err
			}
		}

		if len(fileIdsToMoveFromFolder) > 0 {
			_, err := tx.Model(&entity.ContentDraftEntity{}).
				Where("project_id = ?", projectId).
				Where("branch_name = ?", branchName).
				Where("file_id in (?)", pg.In(fileIdsToMoveFromFolder)).
				Set("from_folder = ?", false).
				Update()
			if err != nil {
				return err
			}
		}

		return nil
	})
	return err
}
