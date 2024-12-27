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

package service

import (
	"archive/zip"
	"bytes"
	goctx "context"
	"crypto/tls"
	"fmt"
	"io/ioutil"
	"mime"
	"net/http"
	"path"
	"strings"
	"sync"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/websocket"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type DraftContentService interface {
	CreateDraftContentWithData(ctx context.SecurityContext, projectId string, branchName string, contents []view.Content, contentData []view.ContentData) ([]string, error)
	GetContentFromDraftOrGit(ctx context.SecurityContext, projectId string, branchName string, contentId string) (*view.ContentData, error)
	UpdateDraftContentData(ctx context.SecurityContext, projectId string, branchName string, contentId string, data []byte) error
	ChangeFileId(ctx context.SecurityContext, projectId string, branchName string, fileId string, newFileId string) error
	ExcludeFile(ctx context.SecurityContext, projectId string, branchName string, fileId string) error
	DeleteFile(ctx context.SecurityContext, projectId string, branchName string, fileId string) error
	AddGitFiles(ctx context.SecurityContext, projectId string, branchName string, paths []string, publish bool) ([]string, error)
	AddFileFromUrl(ctx context.SecurityContext, projectId string, branchName string, url string, filePath string, publish bool) ([]string, error)
	AddEmptyFile(ctx context.SecurityContext, projectId string, branchName string, name string, fileType view.ShortcutType, filePath string, publish bool) ([]string, error)
	UpdateMetadata(ctx context.SecurityContext, projectId string, branchName string, path string, metaPatch view.ContentMetaPatch, bulk bool) error
	ResetFile(ctx context.SecurityContext, projectId string, branchName string, fileId string) error
	RestoreFile(ctx context.SecurityContext, projectId string, branchName string, fileId string) error
	GetAllZippedContentFromDraftOrGit(ctx context.SecurityContext, projectId string, branchName string) ([]byte, error)
}

func NewContentService(draftRepository repository.DraftRepository,
	projectService ProjectService,
	branchService BranchService,
	gitClientProvider GitClientProvider,
	websocketService WsBranchService,
	templateService TemplateService,
	systemInfoService SystemInfoService) DraftContentService {
	return &draftContentServiceImpl{
		draftRepository:   draftRepository,
		projectService:    projectService,
		branchService:     branchService,
		gitClientProvider: gitClientProvider,
		websocketService:  websocketService,
		templateService:   templateService,
		systemInfoService: systemInfoService,
	}
}

type draftContentServiceImpl struct {
	draftRepository   repository.DraftRepository
	projectService    ProjectService
	branchService     BranchService
	gitClientProvider GitClientProvider
	websocketService  WsBranchService
	templateService   TemplateService
	systemInfoService SystemInfoService
}

func (c draftContentServiceImpl) CreateDraftContentWithData(ctx context.SecurityContext, projectId string, branchName string, contents []view.Content, contentData []view.ContentData) ([]string, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("CreateDraftContentWithData(%s,%s,%+v,...)", projectId, branchName, contents))

	var err error
	var resultFileIds []string

	fileIds := make(map[string]bool)
	folders := make(map[string]bool)

	draftExists, err := c.branchService.DraftExists(projectId, branchName)
	if err != nil {
		return nil, err
	}
	if !draftExists {
		err = c.branchService.CreateDraftFromGit(goCtx, projectId, branchName)
		if err != nil {
			return nil, err
		}
	}
	branch, err := c.branchService.GetBranchDetailsFromDraft(goCtx, projectId, branchName, false)
	if err != nil {
		return nil, err
	}
	branch.RemoveFolders()
	for _, file := range branch.Files {
		fileIds[file.FileId] = true
		folders[file.Path+"/"] = true
	}

	var contentEnts []*entity.ContentDraftEntity

	for index, content := range contents {
		if content.FileId == "" {
			if validationErr := validateFileInfo("", content.Path, content.Name); validationErr != nil {
				return nil, validationErr
			}
			content.FileId = generateFileId(content.Path, content.Name)
		} else {
			if validationErr := validateFileInfo(content.FileId, "", ""); validationErr != nil {
				return nil, validationErr
			}
			content.FileId = utils.NormalizeFileId(content.FileId)
		}

		err = checkAvailability(content.FileId, fileIds, folders)
		if err != nil {
			return nil, err
		}
		content.Path, content.Name = utils.SplitFileId(content.FileId)

		if content.Type == "" {
			content.Type = getContentType(content.FileId, &contentData[index].Data)
		}

		lastIndex := len(fileIds)
		var preparedData []byte
		if strings.Contains(getMediaType(contentData[index].Data), "text/plain") {
			preparedData = convertEol(contentData[index].Data)
		} else {
			preparedData = contentData[index].Data
		}
		ent := entity.MakeContentEntity(&content, lastIndex, projectId, branchName, preparedData, getMediaType(contentData[index].Data), string(view.StatusAdded))

		contentEnts = append(contentEnts, ent)

		fileIds[content.FileId] = true
		resultFileIds = append(resultFileIds, content.FileId)

	}

	err = c.draftRepository.SetContents(contentEnts)
	if err != nil {
		return nil, err
	}
	defaultPublish := true
	emptyStr := ""
	for _, fileId := range resultFileIds {
		c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
			websocket.BranchFilesUpdatedPatch{
				Type:      websocket.BranchFilesUpdatedType,
				UserId:    ctx.GetUserId(),
				Operation: "add",
				Data: &websocket.BranchFilesUpdatedPatchData{
					FileId:     fileId,
					Publish:    &defaultPublish,
					BlobId:     &emptyStr,
					ChangeType: view.CTAdded,
					Status:     view.StatusAdded},
			})
	}
	err = c.branchService.RecalculateDraftConfigChangeType(goCtx, projectId, branchName)
	if err != nil {
		return nil, err
	}

	return resultFileIds, nil
}

func (c draftContentServiceImpl) GetContentFromDraftOrGit(ctx context.SecurityContext, projectId string, branchName string, contentId string) (*view.ContentData, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetContentFromDraftOrGit(%s,%s,%s)", projectId, branchName, contentId))

	ent, err := c.draftRepository.GetContentWithData(projectId, branchName, contentId)
	if err != nil {
		return nil, err
	}
	if ent != nil {
		if ent.BlobId == "" || ent.Data != nil {
			// get data from draft
			return entity.MakeContentDataView(ent), err
		}
		// otherwise, get data from git
	}
	draftExists, err := c.branchService.DraftExists(projectId, branchName)
	if err != nil {
		return nil, err
	}
	if !draftExists {
		err = c.branchService.CreateDraftFromGit(goCtx, projectId, branchName)
		if err != nil {
			return nil, err
		}
	}
	branch, err := c.branchService.GetBranchDetailsFromDraft(goCtx, projectId, branchName, false)
	if err != nil {
		return nil, err
	}
	branch.RemoveFolders()
	var content view.Content
	for _, cont := range branch.Files {
		if cont.FileId == contentId {
			content = cont
			break
		}
	}
	if content.FileId == "" || content.BlobId == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ContentIdNotFound,
			Message: exception.ContentIdNotFoundMsg,
			Params: map[string]interface{}{
				"contentId": contentId,
				"branch":    branchName,
				"projectId": projectId},
		}
	}
	return c.updateUnsavedContentDataFromGit(ctx, projectId, branchName, content)
}

func (c draftContentServiceImpl) UpdateDraftContentData(ctx context.SecurityContext, projectId string, branchName string, fileId string, data []byte) error {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("UpdateDraftContentData(%s,%s,%s,...)", projectId, branchName, fileId))

	// TODO: temp for for frontend issue
	if fileId == "undefined" {
		return fmt.Errorf("incorrect content id: undefined")
	}

	draftExists, err := c.branchService.DraftExists(projectId, branchName)
	if err != nil {
		return err
	}
	if !draftExists {
		// sendNotification = true // branch file updated event should be sent on first draft edit(add content to draft)
		err = c.branchService.CreateDraftFromGit(goCtx, projectId, branchName)
		if err != nil {
			return err
		}
	}

	file, err := c.draftRepository.GetContent(projectId, branchName, fileId)
	if err != nil {
		return err
	}
	if file == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ContentIdNotFound,
			Message: exception.ContentIdNotFoundMsg,
			Params:  map[string]interface{}{"contentId": fileId, "branch": branchName, "projectId": projectId},
		}
	}

	sendPatch := false
	if file.Status == string(view.StatusUnmodified) || file.Status == string(view.StatusMoved) || file.Status == string(view.StatusIncluded) {
		sendPatch = true // branch file updated event should be sent on first file edit
	}

	status := view.StatusModified
	fileStatus := view.ParseFileStatus(file.Status)
	patchData := &websocket.BranchFilesUpdatedPatchData{ChangeType: view.CTUpdated}

	switch fileStatus {
	case view.StatusAdded, view.StatusModified:
		{
			status = fileStatus
		}
	case view.StatusDeleted, view.StatusExcluded:
		{
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.NotApplicableOperation,
				Message: exception.NotApplicableOperationMsg,
				Params:  map[string]interface{}{"operation": "modify", "status": fileStatus},
			}
		}
	}

	patchData.Status = status
	err = c.draftRepository.UpdateContentData(projectId, branchName, fileId, data, getMediaType(data), string(status), file.BlobId)
	if err != nil {
		return err
	}
	c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
		websocket.BranchFilesDataModified{
			Type:   websocket.BranchFilesDataModifiedType,
			UserId: ctx.GetUserId(),
			FileId: file.FileId,
		})

	if sendPatch && fileStatus != status {
		c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
			websocket.BranchFilesUpdatedPatch{
				Type:      websocket.BranchFilesUpdatedType,
				UserId:    ctx.GetUserId(),
				Operation: "patch",
				FileId:    file.FileId,
				Data:      patchData,
			})
	}
	return nil
}

func (c draftContentServiceImpl) ChangeFileId(ctx context.SecurityContext, projectId string, branchName string, fileId string, newFileId string) error {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("ChangeFileId(%s,%s,%s,%s)", projectId, branchName, fileId, newFileId))

	if validationErr := validateFileInfo(newFileId, "", ""); validationErr != nil {
		return validationErr
	}
	newFileId = utils.NormalizeFileId(newFileId)

	draftExists, err := c.branchService.DraftExists(projectId, branchName)
	if err != nil {
		return err
	}

	if !draftExists {
		if err = c.branchService.CreateDraftFromGit(goCtx, projectId, branchName); err != nil {
			return err
		}
	}

	branchDetails, err := c.branchService.GetBranchDetailsFromDraft(goCtx, projectId, branchName, false)
	if err != nil {
		return err
	}
	branchDetails.RemoveFolders()

	var file *view.Content
	var index int
	fileIds := make(map[string]bool)
	folders := make(map[string]bool)
	for i, f := range branchDetails.Files {
		if f.FileId == fileId {
			tmp := f
			file = &tmp
			index = i
			continue
		}

		fileIds[f.FileId] = true
		folders[f.Path+"/"] = true
	}
	if file == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.FileNotFound,
			Message: exception.FileNotFoundMsg,
			Params:  map[string]interface{}{"fileId": fileId, "branch": branchName, "projectGitId": projectId},
		}
	}
	err = checkAvailability(newFileId, fileIds, folders)
	if err != nil {
		return err
	}

	patchData := &websocket.BranchFilesUpdatedPatchData{FileId: newFileId}

	status := view.StatusMoved
	fileStatus := file.Status
	switch fileStatus {
	case view.StatusAdded:
		{
			status = fileStatus
			file.MovedFrom = ""
		}
	case view.StatusModified:
		{
			status = fileStatus
			if file.MovedFrom == "" {
				file.MovedFrom = fileId
				patchData.MovedFrom = &fileId
			}
		}
	case view.StatusUnmodified, view.StatusIncluded:
		{
			patchData.Status = status
			patchData.ChangeType = view.CTUpdated
			if file.MovedFrom == "" {
				file.MovedFrom = fileId
				patchData.MovedFrom = &fileId
			}
		}
	case view.StatusExcluded, view.StatusDeleted:
		{
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.NotApplicableOperation,
				Message: exception.NotApplicableOperationMsg,
				Params:  map[string]interface{}{"operation": "rename/move", "status": file.Status},
			}
		}
	}

	fileData, err := c.GetContentFromDraftOrGit(ctx, projectId, branchName, fileId)
	if err != nil {
		return err
	}
	file.FileId = newFileId
	file.Path, file.Name = utils.SplitFileId(newFileId)
	file.FromFolder = false

	ent := entity.MakeContentEntity(file, index, projectId, branchName, fileData.Data, getMediaType(fileData.Data), string(status))
	err = c.draftRepository.ReplaceContent(projectId, branchName, fileId, ent)
	if err != nil {
		return err
	}
	c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
		websocket.BranchFilesUpdatedPatch{
			Type:      websocket.BranchFilesUpdatedType,
			UserId:    ctx.GetUserId(),
			Operation: "patch",
			FileId:    fileId,
			Data:      patchData,
		})
	err = c.branchService.RecalculateDraftConfigChangeType(goCtx, projectId, branchName)
	if err != nil {
		return err
	}

	return nil
}

func (c draftContentServiceImpl) ExcludeFile(ctx context.SecurityContext, projectId string, branchName string, fileId string) error {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("ExcludeFile(%s,%s,%s)", projectId, branchName, fileId))

	draftExists, err := c.branchService.DraftExists(projectId, branchName)
	if err != nil {
		return err
	}

	if !draftExists {
		err = c.branchService.CreateDraftFromGit(goCtx, projectId, branchName)
		if err != nil {
			return err
		}
	}
	fileFromDraft, err := c.draftRepository.GetContent(projectId, branchName, fileId)
	if err != nil {
		return err
	}
	if fileFromDraft == nil {
		// check it if's a folder
		files, err := c.draftRepository.GetContents(projectId, branchName)
		if err != nil {
			return err
		}
		var toDelete []string
		for _, file := range files {
			if strings.HasPrefix(file.FileId, fileId) && (file.Status != view.StatusExcluded.String()) {
				toDelete = append(toDelete, file.FileId)
			}
		}
		if len(toDelete) == 0 {
			return &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.NoContentToDelete,
				Message: exception.NoContentToDeleteMsg,
				Params:  map[string]interface{}{"contentId": fileId, "branch": branchName, "projectId": projectId},
			}
		}
		for _, file := range toDelete {
			err = c.ExcludeFile(ctx, projectId, branchName, file)
			if err != nil {
				return err
			}
		}
		return nil
	}

	fileStatus := view.ParseFileStatus(fileFromDraft.Status)
	lastStatus := string(fileStatus)
	patchData := &websocket.BranchFilesUpdatedPatchData{Status: view.StatusExcluded}

	switch fileStatus {
	case view.StatusAdded, view.StatusModified:
		{
			patchData.ChangeType = view.CTUnchanged
		}
	case view.StatusDeleted:
		{
			lastStatus = fileFromDraft.LastStatus
			patchData.ChangeType = view.CTUnchanged
		}
	case view.StatusExcluded:
		{
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.NotApplicableOperation,
				Message: exception.NotApplicableOperationMsg,
				Params:  map[string]interface{}{"operation": "exclude from config", "status": fileStatus},
			}
		}
	}

	err = c.draftRepository.UpdateContentStatus(projectId, branchName, fileId, string(view.StatusExcluded), lastStatus)
	if err != nil {
		return err
	}

	c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
		websocket.BranchFilesUpdatedPatch{
			Type:      websocket.BranchFilesUpdatedType,
			UserId:    ctx.GetUserId(),
			Operation: "patch",
			FileId:    fileId,
			Data:      patchData,
		})
	err = c.branchService.RecalculateDraftConfigChangeType(goCtx, projectId, branchName)
	if err != nil {
		return err
	}
	return nil
}

func (c draftContentServiceImpl) DeleteFile(ctx context.SecurityContext, projectId string, branchName string, fileId string) error {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("DeleteFile(%s,%s,%s)", projectId, branchName, fileId))

	draftExists, err := c.branchService.DraftExists(projectId, branchName)
	if err != nil {
		return err
	}

	if !draftExists {
		err = c.branchService.CreateDraftFromGit(goCtx, projectId, branchName)
		if err != nil {
			return err
		}
	}
	fileFromDraft, err := c.draftRepository.GetContent(projectId, branchName, fileId)
	if err != nil {
		return err
	}
	if fileFromDraft == nil {
		// check it if's a folder
		files, err := c.draftRepository.GetContents(projectId, branchName)
		if err != nil {
			return err
		}
		var toDelete []string
		for _, file := range files {
			if strings.HasPrefix(file.FileId, fileId) && (file.Status != view.StatusDeleted.String()) {

				toDelete = append(toDelete, file.FileId)
			}
		}
		if len(toDelete) == 0 {
			return &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.NoContentToDelete,
				Message: exception.NoContentToDeleteMsg,
				Params:  map[string]interface{}{"contentId": fileId, "branch": branchName, "projectId": projectId},
			}
		}
		for _, file := range toDelete {
			err = c.DeleteFile(ctx, projectId, branchName, file)
			if err != nil {
				return err
			}
		}
		return nil
	}

	fileStatus := view.ParseFileStatus(fileFromDraft.Status)
	lastStatus := string(fileStatus)
	patchData := &websocket.BranchFilesUpdatedPatchData{Status: view.StatusDeleted}

	switch fileStatus {
	case view.StatusIncluded, view.StatusMoved, view.StatusUnmodified, view.StatusModified:
		{
			patchData.ChangeType = view.CTDeleted
		}
	case view.StatusExcluded:
		{
			lastStatus = fileFromDraft.LastStatus
			patchData.ChangeType = view.CTDeleted
		}
	case view.StatusAdded, view.StatusDeleted:
		{
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.NotApplicableOperation,
				Message: exception.NotApplicableOperationMsg,
				Params:  map[string]interface{}{"operation": "delete from git", "status": fileStatus},
			}
		}
	}

	err = c.draftRepository.UpdateContentStatus(projectId, branchName, fileId, string(view.StatusDeleted), lastStatus)
	if err != nil {
		return err
	}

	c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
		websocket.BranchFilesUpdatedPatch{
			Type:      websocket.BranchFilesUpdatedType,
			UserId:    ctx.GetUserId(),
			Operation: "patch",
			FileId:    fileId,
			Data:      patchData,
		})
	err = c.branchService.RecalculateDraftConfigChangeType(goCtx, projectId, branchName)
	if err != nil {
		return err
	}
	return nil
}

func (c draftContentServiceImpl) AddGitFiles(ctx context.SecurityContext, projectId string, branchName string, paths []string, publish bool) ([]string, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("AddGitFiles(%s,%s,%+v,%t)", projectId, branchName, paths, publish))

	draftExists, err := c.branchService.DraftExists(projectId, branchName)
	if err != nil {
		return nil, err
	}
	if !draftExists {
		err = c.branchService.CreateDraftFromGit(goCtx, projectId, branchName)
		if err != nil {
			return nil, err
		}
	}

	project, err := c.projectService.GetProject(ctx, projectId)
	if err != nil {
		return nil, err
	}
	gitClient, err := c.gitClientProvider.GetUserClient(project.Integration.Type, ctx.GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}

	newFiles := make(map[string]*view.Content, 0)
	entities := make([]*entity.ContentDraftEntity, 0)
	branchFiles := make(map[string]view.Content)
	fileIds := make(map[string]bool)
	folders := make(map[string]bool)

	branch, err := c.branchService.GetBranchDetailsFromDraft(goCtx, projectId, branchName, false)
	if err != nil {
		return nil, err
	}
	for _, file := range branch.Files {
		branchFiles[file.FileId] = file
		fileIds[file.FileId] = true
		folders[file.Path+"/"] = true
	}
	lastIndex := len(branchFiles)
	patches := make([]websocket.BranchFilesUpdatedPatch, 0)

	filesFromFolders := make(map[string]bool, 0)
	folderPaths := make([]string, 0)
	originalPaths := make(map[string]bool, 0)
	for _, path := range paths {
		originalPaths[path] = true
		if strings.HasSuffix(path, "/") {
			fileIdsFromFolder, err := gitClient.ListDirectoryFilesRecursive(goCtx, project.Integration.RepositoryId, branchName, path)
			if err != nil {
				return nil, err
			}
			for _, fileId := range fileIdsFromFolder {
				if fileIds[fileId] {
					continue
				}
				filesFromFolders[fileId] = true
				paths = append(paths, fileId)
			}
			folderPaths = append(folderPaths, path)
		}
	}
	for _, folderFileId := range folderPaths {
		if validationErr := validateFileInfo(folderFileId, "", ""); validationErr != nil {
			return nil, validationErr
		}
		folderFileId = utils.NormalizeFileId(folderFileId)
		if fileIds[folderFileId] {
			continue
		}
		content := view.Content{FileId: folderFileId, Publish: false, Included: true, IsFolder: true}
		content.Path, content.Name = utils.SplitFileId(content.FileId)
		lastIndex++
		ent := entity.MakeContentEntity(&content, lastIndex, projectId, branchName, []byte{}, "text/plain", string(view.StatusIncluded))
		entities = append(entities, ent)
	}
	for _, fileId := range paths {
		if strings.HasSuffix(fileId, "/") {
			continue
		}
		if validationErr := validateFileInfo(fileId, "", ""); validationErr != nil {
			return nil, validationErr
		}
		fileId = utils.NormalizeFileId(fileId)
		gitContentData, err := getContentDataFromGit(goCtx, gitClient, project.Integration.RepositoryId, branchName, fileId)
		if err != nil {
			return nil, err
		}
		if f, inBranch := branchFiles[fileId]; inBranch {
			file, err := c.draftRepository.GetContent(projectId, branchName, f.FileId)
			if err != nil {
				return nil, err
			}
			if file == nil {
				continue
			}
			fileStatus := view.ParseFileStatus(file.Status)
			if fileStatus == view.StatusExcluded || fileStatus == view.StatusDeleted {
				fileLastStatus := view.ParseFileStatus(file.LastStatus)
				status := view.StatusUnmodified
				patchData := &websocket.BranchFilesUpdatedPatchData{ChangeType: view.CTUnchanged}
				if fileStatus == view.StatusDeleted || fileLastStatus == view.StatusIncluded || fileLastStatus == view.StatusAdded {
					status = view.StatusIncluded
				}
				if filesFromFolders[file.FileId] && len(file.Labels) == 0 && !file.Publish {
					file.FromFolder = true
				}
				patchData.Status = status
				file.LastStatus = ""
				if file.MovedFrom != "" {
					file.MovedFrom = ""
					patchData.MovedFrom = &file.MovedFrom
				}
				if file.BlobId != gitContentData.BlobId {
					file.BlobId = gitContentData.BlobId
					patchData.BlobId = &file.BlobId
				}
				file.Status = string(status)
				file.Data = gitContentData.Data
				entities = append(entities, file)
				patches = append(patches, websocket.BranchFilesUpdatedPatch{
					Type:      websocket.BranchFilesUpdatedType,
					UserId:    ctx.GetUserId(),
					FileId:    file.FileId,
					Operation: "patch",
					Data:      patchData,
				})
			}
			continue
		}

		err = checkAvailability(fileId, fileIds, folders)
		if err != nil {
			return nil, err
		}

		content := view.Content{FileId: fileId, Publish: publish, Included: true}
		// if file was imported from folder and original list doesn't contain this file
		if !originalPaths[fileId] && filesFromFolders[fileId] {
			_, alreadyImported := newFiles[fileId]
			if alreadyImported {
				continue
			}
			content.Publish = false
			content.FromFolder = true
		}
		content.Path, content.Name = utils.SplitFileId(content.FileId)
		content.BlobId = gitContentData.BlobId
		lastIndex++
		ent := entity.MakeContentEntity(&content, lastIndex, projectId, branchName, gitContentData.Data, getMediaType(gitContentData.Data), string(view.StatusIncluded))
		entities = append(entities, ent)
		newFiles[content.FileId] = &content

	}

	err = c.draftRepository.SetContents(entities)
	if err != nil {
		return nil, err
	}
	for _, patch := range patches {
		c.websocketService.NotifyProjectBranchUsers(projectId, branchName, patch)
	}

	newFileIds := make([]string, 0)
	for fileId, file := range newFiles {
		newFileIds = append(newFileIds, fileId)
		c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
			websocket.BranchFilesUpdatedPatch{
				Type:      websocket.BranchFilesUpdatedType,
				UserId:    ctx.GetUserId(),
				Operation: "add",
				Data: &websocket.BranchFilesUpdatedPatchData{
					FileId:     fileId,
					Publish:    &file.Publish,
					Status:     view.StatusIncluded,
					ChangeType: view.CTUnchanged,
					BlobId:     &file.BlobId,
				},
			})
	}
	err = c.branchService.RecalculateDraftConfigChangeType(goCtx, projectId, branchName)
	if err != nil {
		return nil, err
	}
	return newFileIds, nil
}

func (c draftContentServiceImpl) AddFileFromUrl(ctx context.SecurityContext, projectId string, branchName string, fileUrl string, filePath string, publish bool) ([]string, error) {
	files := make([]view.Content, 0)
	filesData := make([]view.ContentData, 0)
	httpTransport := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	httpClient := http.Client{Transport: &httpTransport, Timeout: time.Second * 60}
	resp, err := httpClient.Get(fileUrl)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UrlUnexpectedErr,
			Message: exception.UrlUnexpectedErrMsg,
			Debug:   err.Error(),
		}
	}

	if resp.ContentLength > c.systemInfoService.GetPublishFileSizeLimitMB() {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PublishFileSizeExceeded,
			Message: exception.PublishFileSizeExceededMsg,
			Params:  map[string]interface{}{"size": c.systemInfoService.GetPublishFileSizeLimitMB()},
		}
	}

	var filename string
	headerValue := resp.Header.Get("Content-Disposition")
	if headerValue == "" {
		filename = path.Base(fileUrl)
	} else {
		_, params, err := mime.ParseMediaType(headerValue)
		if err != nil {
			return nil, err
		}
		filename = params["filename"]
		if filename == "" {
			filename = path.Base(fileUrl)
		}
	}

	if fileUrl != resp.Request.URL.String() || resp.StatusCode != 200 {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidUrl,
			Message: exception.InvalidUrlMsg,
		}
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.UrlUnexpectedErr,
			Message: exception.UrlUnexpectedErrMsg,
			Debug:   err.Error(),
		}
	}
	files = append(files, view.Content{Name: filename, Path: filePath, Publish: publish})
	filesData = append(filesData, view.ContentData{Data: body})
	return c.CreateDraftContentWithData(ctx, projectId, branchName, files, filesData)
}

func (c draftContentServiceImpl) AddEmptyFile(ctx context.SecurityContext, projectId string, branchName string, name string, fileType view.ShortcutType, filePath string, publish bool) ([]string, error) {
	files := make([]view.Content, 0)
	filesData := make([]view.ContentData, 0)
	data := c.templateService.GetFileTemplate(name, string(fileType))
	files = append(files, view.Content{Name: name, Path: filePath, Type: fileType, Publish: publish})
	filesData = append(filesData, view.ContentData{Data: []byte(data)})
	return c.CreateDraftContentWithData(ctx, projectId, branchName, files, filesData)
}

func (c draftContentServiceImpl) UpdateMetadata(ctx context.SecurityContext, projectId string, branchName string, path string, metaPatch view.ContentMetaPatch, bulk bool) error {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("UpdateMetadata(%s,%s,%s,%+v,%t)", projectId, branchName, path, metaPatch, bulk))

	var err error
	draftExists, err := c.branchService.DraftExists(projectId, branchName)
	if err != nil {
		return err
	}

	if !draftExists {
		err = c.branchService.CreateDraftFromGit(goCtx, projectId, branchName)
		if err != nil {
			return err
		}
	}
	fileUpdated := make(map[string]bool, 0)
	publishUpdated := make(map[string]bool, 0)
	labelsUpdated := make(map[string]bool, 0)

	if bulk {
		filesPublishUpdated, filesLabelsUpdated, err := c.updateFolderMetadata(ctx, projectId, branchName, path, metaPatch)
		if err != nil {
			return err
		}
		for _, fileId := range filesPublishUpdated {
			fileUpdated[fileId] = true
			publishUpdated[fileId] = true
		}
		for _, fileId := range filesLabelsUpdated {
			fileUpdated[fileId] = true
			labelsUpdated[fileId] = true
		}
	} else {
		filePublishUpdated, fileLabelsUpdated, err := c.updateFileMetadata(ctx, projectId, branchName, path, metaPatch)
		if err != nil {
			return err
		}
		fileUpdated[path] = filePublishUpdated || fileLabelsUpdated
		publishUpdated[path] = filePublishUpdated
		labelsUpdated[path] = fileLabelsUpdated
	}

	configChanged := false
	for fileId, updated := range fileUpdated {
		if !updated {
			continue
		}
		configChanged = true
		wsMetaUpdatePatchData := &websocket.BranchFilesUpdatedPatchData{}
		if publishUpdated[fileId] {
			wsMetaUpdatePatchData.Publish = metaPatch.Publish
		}
		if labelsUpdated[fileId] {
			wsMetaUpdatePatchData.Labels = metaPatch.Labels
		}
		c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
			websocket.BranchFilesUpdatedPatch{
				Type:      websocket.BranchFilesUpdatedType,
				UserId:    ctx.GetUserId(),
				Operation: "patch",
				FileId:    fileId,
				Data:      wsMetaUpdatePatchData,
			})
	}
	if configChanged {
		err = c.branchService.RecalculateDraftConfigChangeType(goCtx, projectId, branchName)
		if err != nil {
			return err
		}
	}
	return nil
}

func (c draftContentServiceImpl) updateFileMetadata(ctx context.SecurityContext, projectId string, branchName string, fileId string, metaPatch view.ContentMetaPatch) (bool, bool, error) {
	file, err := c.draftRepository.GetContent(projectId, branchName, fileId)
	if err != nil {
		return false, false, err
	}
	if file == nil {
		return false, false, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ContentIdNotFound,
			Message: exception.ContentIdNotFoundMsg,
			Params:  map[string]interface{}{"contentId": fileId, "branch": branchName, "projectId": projectId},
		}
	}
	publish := metaPatch.Publish
	labels := metaPatch.Labels
	publishUpdated := false
	labelsUpdated := false
	if publish != nil {
		if file.Publish != *publish {
			publishUpdated = true
			file.Publish = *publish
		}
	}
	if labels != nil {
		if !equalStringSets(file.Labels, *labels) {
			labelsUpdated = true
			file.Labels = *labels
		}
	}
	if publishUpdated || labelsUpdated {
		if file.FromFolder &&
			(file.Publish || len(file.Labels) > 0) {
			file.FromFolder = false
		}
		err = c.draftRepository.UpdateContentMetadata(file)
		if err != nil {
			return false, false, err
		}
	}
	return publishUpdated, labelsUpdated, nil
}

func (c draftContentServiceImpl) updateFolderMetadata(ctx context.SecurityContext, projectId string, branchName string, path string, metaPatch view.ContentMetaPatch) ([]string, []string, error) {
	files, err := c.draftRepository.GetContents(projectId, branchName)
	if err != nil {
		return nil, nil, err
	}
	publish := metaPatch.Publish
	labels := metaPatch.Labels
	filesToUpdate := make([]*entity.ContentDraftEntity, 0)
	entitiesToUpdate := make([]*entity.ContentDraftEntity, 0)
	publishUpdated := make([]string, 0)
	labelsUpdated := make([]string, 0)
	//if path == "/" change meta for all project files
	if path == "/" {
		path = ""
	}
	for _, file := range files {
		if !file.IsFolder && strings.HasPrefix(file.Path, path) {
			fileTmp := file
			filesToUpdate = append(filesToUpdate, &fileTmp)
		}
	}
	if publish != nil {
		for _, file := range filesToUpdate {
			if file.Publish != *metaPatch.Publish {
				publishUpdated = append(publishUpdated, file.FileId)
				file.Publish = *publish
				entitiesToUpdate = append(entitiesToUpdate, file)
			}
		}
	}
	if labels != nil {
		for _, file := range filesToUpdate {
			if !equalStringSets(file.Labels, *labels) {
				labelsUpdated = append(labelsUpdated, file.FileId)
				file.Labels = *labels
				entitiesToUpdate = append(entitiesToUpdate, file)
			}
		}
	}
	if len(entitiesToUpdate) > 0 {
		for index := range entitiesToUpdate {
			entity := entitiesToUpdate[index]
			if entity.FromFolder &&
				(entity.Publish || len(entity.Labels) > 0) {
				entity.FromFolder = false
			}
		}
		err = c.draftRepository.UpdateContentsMetadata(entitiesToUpdate)
	}
	if err != nil {
		return nil, nil, err
	}
	return publishUpdated, labelsUpdated, nil
}

func (c draftContentServiceImpl) ResetFile(ctx context.SecurityContext, projectId string, branchName string, fileId string) error {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("ResetFile(%s,%s,%s)", projectId, branchName, fileId))

	fileFromDraft, err := c.draftRepository.GetContent(projectId, branchName, fileId)
	if err != nil {
		return err
	}
	if fileFromDraft == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.DraftFileNotFound,
			Message: exception.DraftFileNotFoundMsg,
			Params:  map[string]interface{}{"fileId": fileId, "branchName": branchName, "projectId": projectId},
		}
	}
	project, err := c.projectService.GetProject(ctx, projectId)
	if err != nil {
		return err
	}
	gitClient, err := c.gitClientProvider.GetUserClient(project.Integration.Type, ctx.GetUserId())
	if err != nil {
		return fmt.Errorf("failed to get git client: %v", err)
	}
	fileStatus := view.ParseFileStatus(fileFromDraft.Status)
	status := view.StatusUnmodified
	if fileFromDraft.Included {
		status = view.StatusIncluded
	}
	resetData := false
	switch fileStatus {
	case view.StatusAdded:
		{
			err = c.draftRepository.DeleteContent(projectId, branchName, fileFromDraft.FileId)
			if err != nil {
				return err
			}
		}
	case view.StatusModified, view.StatusMoved:
		{
			if fileFromDraft.MovedFrom != "" {
				oldIdTaken, err := c.draftRepository.ContentExists(projectId, branchName, fileFromDraft.MovedFrom)
				if err != nil {
					return err
				}
				if oldIdTaken {
					err = c.draftRepository.DeleteContent(projectId, branchName, fileFromDraft.FileId)
					if err != nil {
						return err
					}
				} else {
					branch, err := c.branchService.GetBranchDetailsFromDraft(goCtx, projectId, branchName, false)
					if err != nil {
						return err
					}
					branch.RemoveFolders()
					fileIds := make(map[string]bool)
					folders := make(map[string]bool)
					for _, file := range branch.Files {
						fileIds[file.FileId] = true
						folders[file.Path+"/"] = true
					}

					err = checkAvailability(fileFromDraft.MovedFrom, fileIds, folders)
					if err != nil {
						return err
					}

					gitContentData, _, err := gitClient.GetFileContentByBlobId(goCtx, project.Integration.RepositoryId, fileFromDraft.BlobId)
					if err != nil {
						return err
					}
					newFileId := fileFromDraft.FileId
					fileFromDraft.FileId = fileFromDraft.MovedFrom
					fileFromDraft.MovedFrom = ""
					fileFromDraft.Path, fileFromDraft.Name = utils.SplitFileId(fileFromDraft.FileId)
					fileFromDraft.Data = gitContentData
					fileFromDraft.Status = string(status)
					fileFromDraft.ConflictedFileId = ""
					err = c.draftRepository.ReplaceContent(projectId, branchName, newFileId, fileFromDraft)
					if err != nil {
						return err
					}
				}
			} else {
				resetData = true
			}
		}
	case view.StatusDeleted:
		{
			resetData = true
			if fileFromDraft.LastStatus == string(view.StatusIncluded) {
				status = view.StatusIncluded
			}
		}
	case view.StatusIncluded, view.StatusExcluded, view.StatusUnmodified:
		{
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.NotApplicableOperation,
				Message: exception.NotApplicableOperationMsg,
				Params:  map[string]interface{}{"operation": "reset", "status": fileStatus},
			}
		}
	}

	if resetData {
		gitContentData, _, err := gitClient.GetFileContentByBlobId(goCtx, project.Integration.RepositoryId, fileFromDraft.BlobId)
		if err != nil {
			return err
		}
		fileFromDraft.Data = gitContentData
		fileFromDraft.MediaType = getMediaType(gitContentData)
		fileFromDraft.Status = string(status)
		fileFromDraft.LastStatus = ""
		err = c.draftRepository.UpdateContent(fileFromDraft)
		if err != nil {
			return err
		}
	}
	c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
		websocket.BranchFilesResetPatch{
			Type:   websocket.BranchFilesResetType,
			UserId: ctx.GetUserId(),
			FileId: fileId,
		})
	branch, err := c.branchService.GetBranchDetailsEP(goCtx, projectId, branchName, true)
	if err != nil {
		c.websocketService.DisconnectClients(projectId, branchName)
		return err
	}
	branch.RemoveFolders()
	c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
		websocket.BranchConfigSnapshot{
			Type: websocket.BranchConfigSnapshotType,
			Data: branch,
		})
	err = c.branchService.RecalculateDraftConfigChangeType(goCtx, projectId, branchName)
	if err != nil {
		return err
	}
	return nil
}

func (c draftContentServiceImpl) RestoreFile(ctx context.SecurityContext, projectId string, branchName string, fileId string) error {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("RestoreFile(%s,%s,%s)", projectId, branchName, fileId))

	fileFromDraft, err := c.draftRepository.GetContent(projectId, branchName, fileId)
	if err != nil {
		return err
	}
	if fileFromDraft == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.DraftFileNotFound,
			Message: exception.DraftFileNotFoundMsg,
			Params:  map[string]interface{}{"fileId": fileId, "$branchName": branchName, "$projectId": projectId},
		}
	}
	fileStatus := view.ParseFileStatus(fileFromDraft.Status)
	lastStatus := view.ParseFileStatus(fileFromDraft.LastStatus)
	patchData := &websocket.BranchFilesUpdatedPatchData{Status: lastStatus}

	switch fileStatus {
	case view.StatusDeleted, view.StatusExcluded:
		{
			err := c.draftRepository.UpdateContentStatus(projectId, branchName, fileId, fileFromDraft.LastStatus, "")
			if err != nil {
				return err
			}
		}
	default:
		{
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.NotApplicableOperation,
				Message: exception.NotApplicableOperationMsg,
				Params:  map[string]interface{}{"operation": "restore", "status": fileStatus},
			}
		}
	}
	switch patchData.Status {
	case view.StatusAdded:
		{
			patchData.ChangeType = view.CTAdded
		}
	case view.StatusModified:
		{
			patchData.ChangeType = view.CTUpdated
		}
	default:
		{
			patchData.ChangeType = view.CTUnchanged
		}
	}

	c.websocketService.NotifyProjectBranchUsers(projectId, branchName,
		websocket.BranchFilesUpdatedPatch{
			Type:      websocket.BranchFilesUpdatedType,
			UserId:    ctx.GetUserId(),
			Operation: "patch",
			FileId:    fileId,
			Data:      patchData,
		})
	err = c.branchService.RecalculateDraftConfigChangeType(goCtx, projectId, branchName)
	if err != nil {
		return err
	}
	return nil
}

func (c draftContentServiceImpl) GetAllZippedContentFromDraftOrGit(ctx context.SecurityContext, projectId string, branchName string) ([]byte, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetAllZippedContentFromDraftOrGit(%s,%s)", projectId, branchName))

	//this call will always create draft if it doesn't already exist
	config, err := c.branchService.GetBranchDetailsEP(goCtx, projectId, branchName, true)
	if err != nil {
		return nil, err
	}

	zipBuf := bytes.Buffer{}
	zw := zip.NewWriter(&zipBuf)

	wg := sync.WaitGroup{}
	errMap := sync.Map{}
	resultFiles := make([][]byte, len(config.Files))

	for iter, file := range config.Files {
		i := iter
		currentFile := file
		wg.Add(1)
		utils.SafeAsync(func() {
			defer wg.Done()

			var contentEnt *entity.ContentDraftEntity

			contentEnt, err = c.draftRepository.GetContentWithData(projectId, branchName, currentFile.FileId)
			if err != nil {
				errMap.Store(currentFile.FileId, err)
				return
			}

			if contentEnt != nil && contentEnt.Data != nil {
				resultFiles[i] = contentEnt.Data
			} else if contentEnt != nil {
				contentData, err := c.updateUnsavedContentDataFromGit(ctx, projectId, branchName, *entity.MakeContentView(contentEnt))
				if err != nil {
					errMap.Store(currentFile.FileId, err)
					return
				}
				resultFiles[i] = contentData.Data
			} else if currentFile.IsFolder {
				resultFiles[i] = nil
			} else {
				//this should not be possible
				errMap.Store(currentFile.FileId, "file not found in draft; contentEnt==nil")
				return
			}
		})
	}

	wg.Wait()

	var errStr string
	errMap.Range(func(key, value interface{}) bool {
		errStr += fmt.Sprintf("file: %v, err: %v. ", key, value)
		return true
	})
	if errStr != "" {
		log.Warnf("Got errors during GetAllZippedContentFromDraftOrGit: %s", errStr) // TODO: or should be err returned?
	}

	for i, file := range config.Files {
		mdFw, err := zw.Create(file.FileId)
		if err != nil {
			return nil, err
		}
		if len(resultFiles[i]) == 0 {
			continue
		}
		_, err = mdFw.Write(resultFiles[i])
		if err != nil {
			return nil, err
		}
	}

	err = zw.Close()
	if err != nil {
		return nil, err
	}

	return zipBuf.Bytes(), nil
}

// this method should only be used for old draft files that did not store git content on draft creation
// todo delete this method when all drafts are updated?
func (d draftContentServiceImpl) updateUnsavedContentDataFromGit(ctx context.SecurityContext, projectId string, branchName string, content view.Content) (*view.ContentData, error) {
	if content.BlobId == GitBlobIdForEmptyFile {
		return &view.ContentData{
			FileId:   content.FileId,
			Data:     []byte{},
			DataType: "text/plain",
			BlobId:   content.BlobId,
		}, nil
	}
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("updateUnsavedContentDataFromGit(%s,%s,%+v)", projectId, branchName, content))

	project, err := d.projectService.GetProject(ctx, projectId)
	if err != nil {
		return nil, err
	}

	gitClient, err := d.gitClientProvider.GetUserClient(project.Integration.Type, ctx.GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}
	var contentData *view.ContentData
	//in this case we have commitId in blobId field and no data for file
	if content.MovedFrom != "" {
		contentData, err = getContentDataFromGit(goCtx, gitClient, project.Integration.RepositoryId, content.BlobId, content.MovedFrom)
	} else {
		contentData, err = getContentDataFromGit(goCtx, gitClient, project.Integration.RepositoryId, content.BlobId, content.FileId)
	}
	if err != nil {
		return nil, err
	}
	//update content data with new blobId replacing commitId value in this field
	err = d.draftRepository.UpdateContentData(projectId, branchName, content.FileId, contentData.Data, getMediaType(contentData.Data), string(content.Status), contentData.BlobId)
	if err != nil {
		return nil, err
	}
	return contentData, nil
}
