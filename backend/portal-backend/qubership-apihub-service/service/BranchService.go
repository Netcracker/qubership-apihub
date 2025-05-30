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
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/archive"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/websocket"
	ws "github.com/gorilla/websocket"
	"github.com/gosimple/slug"
	log "github.com/sirupsen/logrus"
	"golang.org/x/sync/errgroup"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

const (
	ApiHubBaseConfigPath = "apihub-config/"
	maxZipArchiveFiles   = 10000
)

type BranchService interface {
	GetProjectBranchesFromGit(ctx goctx.Context, projectId string, filter string, limit int) ([]view.BranchItemView, error)
	CreateDraftFromGit(ctx goctx.Context, projectId string, branchName string) error
	GetBranchDetails(ctx goctx.Context, projectId string, branchName string) (*view.Branch, error)
	GetBranchDetailsEP(ctx goctx.Context, projectId string, branchName string, createDraft bool) (*view.Branch, error)
	RecalculateDraftConfigChangeType(ctx goctx.Context, projectId string, branchName string) error
	RecalculateDraftConfigFolders(ctx goctx.Context, projectId string, branchName string) error
	UpdateDraftConfigChangeType(ctx goctx.Context, projectId string, branchName string, changeType view.ChangeType) error
	GetBranchDetailsFromDraft(ctx goctx.Context, projectId string, branchName string, allowBrokenRefs bool) (*view.Branch, error)
	GetBranchRawConfigFromDraft(ctx goctx.Context, projectId string, branchName string) ([]byte, error)
	GetBranchDetailsFromGit(ctx goctx.Context, projectId string, branchName string) (*view.Branch, string, error)
	GetBranchDetailsFromGitCommit(ctx goctx.Context, projectId string, branchName string, commitId string) (*view.Branch, error)
	GetBranchRawConfigFromGit(ctx goctx.Context, projectId string, branchName string) ([]byte, error)
	GetContentNoData(ctx goctx.Context, projectId string, branchName string, contentId string) (*view.Content, error)
	DraftExists(projectId string, branchName string) (bool, error)
	DraftContainsChanges(ctx goctx.Context, projectId string, branchName string) (bool, error)
	BranchExists(ctx goctx.Context, projectId string, branchName string) (bool, bool, error)
	CloneBranch(ctx goctx.Context, projectId string, branchName string, newBranchName string) error
	CreateMergeRequest(ctx goctx.Context, projectId string, targetBranchName string, sourceBranchName string, title string, description string) (string, error)
	DeleteBranch(ctx goctx.Context, projectId string, branchName string) error
	ResetBranchDraft(ctx goctx.Context, projectId string, branchName string, sendResetNotification bool) error
	DeleteBranchDraft(projectId string, branchName string) error
	CalculateBranchConflicts(ctx goctx.Context, projectId string, branchName string) (*view.BranchConflicts, error)
	ConnectToWebsocket(ctx goctx.Context, projectId string, branchName string, wsId string, connection *ws.Conn) error
	GetAllZippedContentFromGitCommit(ctx goctx.Context, branchDetails *view.Branch, projectId string, branchName string, commitId string) ([]byte, error)
	GetVersionPublishDetailsFromGitCommit(ctx goctx.Context, projectId string, branchName string, commitId string) (*view.GitVersionPublish, error)
}

func NewBranchService(projectService ProjectService,
	draftRepo repository.DraftRepository,
	gitClientProvider GitClientProvider,
	publishedRepo repository.PublishedRepository,
	wsBranchService WsBranchService,
	branchEditorsService BranchEditorsService,
	branchRepository repository.BranchRepository) BranchService {
	branchService := &branchServiceImpl{
		projectService:       projectService,
		gitClientProvider:    gitClientProvider,
		draftRepo:            draftRepo,
		publishedRepo:        publishedRepo,
		wsBranchService:      wsBranchService,
		branchEditorsService: branchEditorsService,
		branchRepository:     branchRepository,
		branchMapMutex:       &sync.RWMutex{},
		branchMutex:          map[string]*sync.RWMutex{},
	}
	//todo move this to a separate service that manages all other jobs
	branchService.startCleanupJob(time.Second * 30)

	return branchService
}

type branchServiceImpl struct {
	projectService       ProjectService
	gitClientProvider    GitClientProvider
	draftRepo            repository.DraftRepository
	publishedRepo        repository.PublishedRepository
	wsBranchService      WsBranchService
	branchEditorsService BranchEditorsService
	branchRepository     repository.BranchRepository
	branchMapMutex       *sync.RWMutex
	branchMutex          map[string]*sync.RWMutex
}

func (b *branchServiceImpl) GetProjectBranchesFromGit(ctx goctx.Context, projectId string, filter string, limit int) ([]view.BranchItemView, error) {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("GetProjectBranchesFromGit(%s,%s,%d)", projectId, filter, limit))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return nil, fmt.Errorf("security context not found")
	}
	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return nil, err
	}

	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return nil, err
	}

	names, canPush, err := gitClient.GetRepoBranches(ctx, project.Integration.RepositoryId, filter, limit)
	if err != nil {
		return nil, err
	}
	tags, err := gitClient.GetRepoTags(ctx, project.Integration.RepositoryId, filter, limit)
	if err != nil {
		return nil, err
	}
	if len(tags) != 0 {
		names = append(names, tags...)
		canPush = append(canPush, make([]bool, len(tags))...)
	}
	if len(names) == 0 {
		return nil, nil
	}

	var result []view.BranchItemView
	for i, name := range names {
		permissions := make([]string, 0)
		if canPush[i] {
			permissions = append(permissions, "all")
		}
		result = append(result, view.BranchItemView{Name: name, Permissions: permissions})
	}
	sort.SliceStable(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})

	if len(result) < limit {
		return result, nil
	} else {
		return result[:limit], nil
	}
}

func (b *branchServiceImpl) CreateDraftFromGit(ctx goctx.Context, projectId string, branchName string) error {
	branchDetails, currentCommit, err := b.GetBranchDetailsFromGit(ctx, projectId, branchName)
	if err != nil {
		return err
	}
	return b.createBranchDraft(ctx, projectId, branchName, branchDetails, currentCommit)
}

func (b *branchServiceImpl) createBranchDraft(ctx goctx.Context, projectId string, branchName string, branchDetails *view.Branch, currentCommit string) error {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("createBranchDraft(%s,%s,%+v,%s)", projectId, branchName, branchDetails, currentCommit))

	b.branchMapMutex.Lock()
	branchMutexKey := fmt.Sprintf("%v%v%v", projectId, stringSeparator, branchName)
	var mutex *sync.RWMutex
	branchMutexExists := false
	mutex, branchMutexExists = b.branchMutex[branchMutexKey]
	if !branchMutexExists {
		mutex = &sync.RWMutex{}
		b.branchMutex[branchMutexKey] = mutex
	}
	mutex.Lock()
	defer mutex.Unlock()
	b.branchMapMutex.Unlock()

	branchDraftCommitId, err := b.getBranchDraftCommitId(projectId, branchName)
	if err != nil {
		return err
	}
	if branchDraftCommitId != "" && branchDraftCommitId == currentCommit {
		return nil
	}

	start := time.Now()

	branchEnt := entity.BranchDraftEntity{
		ProjectId:      projectId,
		BranchName:     branchName,
		ChangeType:     string(view.CTUnchanged),
		Editors:        []string{},
		OriginalConfig: []byte{},
		CommitId:       currentCommit,
	}

	var contentEnts []*entity.ContentDraftEntity
	var refEnts []entity.BranchRefDraftEntity

	if branchDetails != nil {
		branchEnt.OriginalConfig, err = json.Marshal(view.TransformBranchToGitView(*branchDetails))
		if err != nil {
			return err
		}

		contentEnts, err = b.getBranchContentFromRepositoy(ctx, branchDetails, projectId, branchName, currentCommit)
		if err != nil {
			return err
		}

		for _, ref := range branchDetails.Refs {
			refEnts = append(refEnts, *entity.MakeRefEntity(&ref, projectId, branchName, string(view.StatusUnmodified)))
		}
	}

	err = b.draftRepo.CreateBranchDraft(branchEnt, contentEnts, refEnts)
	log.Infof("[PERF] Create branch draft took %dms", time.Since(start).Milliseconds())
	return err
}

func (b branchServiceImpl) getBranchContentFromRepositoy(ctx goctx.Context, branchDetails *view.Branch, projectId string, branchName string, currentCommit string) ([]*entity.ContentDraftEntity, error) {
	filesCount := len(branchDetails.Files)
	if filesCount < 10 { //if we have more than 10 files in config it is better to download repository as archive and get files from it
		return b.getBranchContentFromRepositoyFiles(ctx, branchDetails, projectId, branchName, currentCommit)
	} else {
		return b.getBranchContentFromRepositoyArchive(ctx, branchDetails, projectId, branchName, currentCommit)
	}
}

func (b branchServiceImpl) getBranchContentFromRepositoyFiles(ctx goctx.Context, branchDetails *view.Branch, projectId string, branchName string, currentCommit string) ([]*entity.ContentDraftEntity, error) {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("getBranchContentFromRepositoyFiles(%s,%s,%+v,%s)", projectId, branchName, branchDetails, currentCommit))

	contentEnts := make([]*entity.ContentDraftEntity, len(branchDetails.Files))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return nil, fmt.Errorf("security context not found")
	}
	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return nil, err
	}

	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}

	eg := errgroup.Group{}
	for index := range branchDetails.Files {
		content := &branchDetails.Files[index]
		i := index
		if !content.IsFolder {
			eg.Go(func() error {
				fileData, _, blobId, err := gitClient.GetFileContent(ctx, project.Integration.RepositoryId, currentCommit, content.FileId)
				if err != nil {
					return err
				}
				content.BlobId = blobId
				var preparedData []byte
				if strings.Contains(getMediaType(fileData), "text/plain") {
					preparedData = convertEol(fileData)
				} else {
					preparedData = fileData
				}
				ent := entity.MakeContentEntity(content, i, projectId, branchName, preparedData, getMediaType(fileData), string(view.StatusUnmodified))
				contentEnts[i] = ent
				return nil
			})
		} else {
			ent := entity.MakeContentEntity(content, i, projectId, branchName, nil, "text/plain", string(view.StatusUnmodified))
			contentEnts[i] = ent
		}
	}

	err = eg.Wait()
	if err != nil {
		return nil, fmt.Errorf("failed to get content from git repository: %w", err)
	}
	return contentEnts, nil
}

func (b branchServiceImpl) getBranchContentFromRepositoyArchive(ctx goctx.Context, branchDetails *view.Branch, projectId string, branchName string, currentCommit string) ([]*entity.ContentDraftEntity, error) {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("getBranchContentFromRepositoyArchive(%s,%s,%+v,%s)", projectId, branchName, branchDetails, currentCommit))

	contentEnts := make([]*entity.ContentDraftEntity, len(branchDetails.Files))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return nil, fmt.Errorf("security context not found")
	}
	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return nil, err
	}

	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}

	tempFolder := "tmp"
	tempFilePath := fmt.Sprintf("%v/%v_@@_%v_@@_%v.zip", tempFolder, project.Integration.RepositoryId, slug.Make(branchName), time.Now().UnixMilli())

	err = os.MkdirAll(tempFolder, 0777)
	if err != nil {
		return nil, err
	}
	gitRepoFile, err := os.Create(tempFilePath)
	if err != nil {
		return nil, err
	}
	defer os.Remove(tempFilePath)
	err = gitClient.WriteCommitArchive(ctx, project.Integration.RepositoryId, currentCommit, gitRepoFile, "zip")
	if err != nil {
		return nil, err
	}
	defer gitRepoFile.Close()

	zipReader, err := zip.OpenReader(tempFilePath)
	if err != nil {
		return nil, err
	}
	defer zipReader.Close()

	//validation was added based on security scan results to avoid resource exhaustion
	if len(zipReader.File) > maxZipArchiveFiles {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FilesLimitExceeded,
			Message: exception.BranchFilesLimitExceededMsg,
			Params:  map[string]interface{}{"maxFiles": maxZipArchiveFiles},
		}
	}

	zipFileHeaders := make(map[string]*zip.File)
	for _, file := range zipReader.File {
		if file.FileInfo().IsDir() {
			continue
		}
		if strings.Contains(file.Name, "/") {
			//remove first folder from filename because its git specific folder that doesn't exist in repository
			filename := strings.SplitN(file.Name, "/", 2)[1]
			zipFilePtr := file
			zipFileHeaders[filename] = zipFilePtr
		}
	}

	eg := errgroup.Group{}
	for index := range branchDetails.Files {
		content := &branchDetails.Files[index]
		i := index
		if !content.IsFolder {
			eg.Go(func() error {
				var fileData []byte
				if fileHeader, exists := zipFileHeaders[content.FileId]; !exists {
					//branch config contains file that doesn't exist in git
					fileData = []byte{}
					content.BlobId = ""
				} else {
					fileData, err = archive.ReadZipFile(fileHeader)
					if err != nil {
						return err
					}
					content.BlobId = calculateGitBlobId(fileData)
				}

				var preparedData []byte
				if strings.Contains(getMediaType(fileData), "text/plain") {
					preparedData = convertEol(fileData)
				} else {
					preparedData = fileData
				}
				ent := entity.MakeContentEntity(content, i, projectId, branchName, preparedData, getMediaType(fileData), string(view.StatusUnmodified))
				contentEnts[i] = ent
				return nil
			})
		} else {
			ent := entity.MakeContentEntity(content, i, projectId, branchName, nil, "text/plain", string(view.StatusUnmodified))
			contentEnts[i] = ent
		}
	}

	err = eg.Wait()
	if err != nil {
		return nil, fmt.Errorf("failed to get content from git repository archive: %w", err)
	}
	return contentEnts, nil
}

const GitBlobIdForEmptyFile = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"

func calculateGitBlobId(s []byte) string {
	p := fmt.Sprintf("blob %d\x00", len(s))
	h := sha1.New()
	h.Write([]byte(p))
	h.Write(s)
	return hex.EncodeToString(h.Sum([]byte(nil)))
}

func (b *branchServiceImpl) expandBranchFolders(ctx goctx.Context, projectId string, branchName string, branchDetails *view.Branch) error {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("expandBranchFolders(%s,%s,%+v)", projectId, branchName, branchDetails))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return fmt.Errorf("security context not found")
	}

	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return err
	}
	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return fmt.Errorf("failed to get git client: %v", err)
	}
	configFiles := make(map[string]*view.Content, 0)
	configFolders := make([]*view.Content, 0)
	for index := range branchDetails.Files {
		content := &branchDetails.Files[index]
		if strings.HasSuffix(content.FileId, "/") {
			content.IsFolder = true
			content.Publish = false
			configFolders = append(configFolders, content)
			continue
		}
		configFiles[content.FileId] = content
	}
	filesFromFolders := make([]view.Content, 0)
	for _, folder := range configFolders {
		folderFileIds, err := gitClient.ListDirectoryFilesRecursive(ctx, project.Integration.RepositoryId, branchName, folder.FileId)
		if err != nil {
			return err //todo custom error
		}
		for _, fileId := range folderFileIds {
			fileId := utils.NormalizeFileId(fileId)
			if configFiles[fileId] != nil {
				if !configFiles[fileId].Publish && len(configFiles[fileId].Labels) == 0 {
					configFiles[fileId].FromFolder = true
				}
				continue
			}
			filePath, fileName := utils.SplitFileId(fileId)
			file := view.Content{
				FileId:     fileId,
				Name:       fileName,
				Type:       view.Unknown,
				Path:       filePath,
				Publish:    false,
				Status:     view.StatusUnmodified,
				Labels:     []string{},
				FromFolder: true,
			}
			filesFromFolders = append(filesFromFolders, file)
			configFiles[fileId] = &file
		}
	}
	branchDetails.Files = append(branchDetails.Files, filesFromFolders...)
	return nil
}

func (b *branchServiceImpl) GetBranchDetails(ctx goctx.Context, projectId string, branchName string) (*view.Branch, error) {
	exists, err := b.DraftExists(projectId, branchName)
	if err != nil {
		return nil, err
	}

	var branchDetails *view.Branch
	if exists {
		branchDetails, err = b.GetBranchDetailsFromDraft(ctx, projectId, branchName, false)
	} else {
		branchDetails, _, err = b.GetBranchDetailsFromGit(ctx, projectId, branchName)
	}
	if branchDetails == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ConfigNotFound,
			Message: exception.ConfigNotFoundMsg,
			Params:  map[string]interface{}{"projectId": projectId, "branch": branchName},
		}
	}

	return branchDetails, err
}

func (b *branchServiceImpl) GetBranchDetailsEP(ctx goctx.Context, projectId string, branchName string, createDraft bool) (*view.Branch, error) {
	draftExists, err := b.DraftExists(projectId, branchName)
	if err != nil {
		return nil, err
	}
	branchExists, canPush, err := b.BranchExists(ctx, projectId, branchName)
	if err != nil {
		return nil, err
	}
	if !branchExists {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BranchNotFound,
			Message: exception.BranchNotFoundMsg,
			Params:  map[string]interface{}{"branch": branchName, "projectId": projectId},
		}
	}

	var branchDetails *view.Branch
	var currentCommit string
	if draftExists {
		branchDetails, err = b.GetBranchDetailsFromDraft(ctx, projectId, branchName, false)
	} else {
		branchDetails, currentCommit, err = b.GetBranchDetailsFromGit(ctx, projectId, branchName)
	}
	if err != nil {
		return nil, err
	}
	if !draftExists && createDraft {
		err = b.createBranchDraft(ctx, projectId, branchName, branchDetails, currentCommit)
		if err != nil {
			return nil, err
		}
	}
	if branchDetails == nil {
		branchDetails = &view.Branch{
			ProjectId: projectId,
			Files:     make([]view.Content, 0),
			Refs:      make([]view.Ref, 0),
		}
	}
	if draftExists {
		branchDraft, err := b.branchRepository.GetBranchDraft(projectId, branchName)
		if err != nil {
			return nil, err
		}
		branchDetails.ChangeType = view.ChangeType(branchDraft.ChangeType)
	} else {
		branchDetails.ChangeType = view.CTUnchanged
	}
	setFileChangeTypes(branchDetails)
	editors, err := b.branchEditorsService.GetBranchEditors(projectId, branchName)
	if err != nil {
		return nil, err
	}
	branchDetails.Editors = editors
	branchDetails.ConfigFileId = getApihubConfigFileId(projectId)
	permissions := make([]string, 0)
	if canPush {
		permissions = append(permissions, "all")
	}
	branchDetails.Permissions = &permissions

	return branchDetails, nil
}

func (b *branchServiceImpl) RecalculateDraftConfigChangeType(ctx goctx.Context, projectId string, branchName string) error {
	err := b.RecalculateDraftConfigFolders(ctx, projectId, branchName)
	if err != nil {
		return err
	}
	branchDraft, err := b.branchRepository.GetBranchDraft(projectId, branchName)
	if err != nil {
		b.wsBranchService.DisconnectClients(projectId, branchName)
		return err
	}
	if branchDraft == nil {
		return nil
	}
	calculatedChangeType, err := b.calculateDraftConfigChangeType(ctx, projectId, branchName, false)
	if err != nil {
		b.wsBranchService.DisconnectClients(projectId, branchName)
		return err
	}
	if branchDraft.ChangeType != string(calculatedChangeType) {
		err = b.branchRepository.SetChangeType(projectId, branchName, string(calculatedChangeType))
		if err != nil {
			b.wsBranchService.DisconnectClients(projectId, branchName)
			return err
		}
		b.wsBranchService.NotifyProjectBranchUsers(projectId, branchName,
			websocket.BranchConfigUpdatedPatch{
				Type: websocket.BranchConfigUpdatedType,
				Data: websocket.BranchConfigUpdatedPatchData{ChangeType: calculatedChangeType},
			})
	}
	return nil
}

func (b *branchServiceImpl) RecalculateDraftConfigFolders(ctx goctx.Context, projectId string, branchName string) error {
	branchDraft, err := b.GetBranchDetailsFromDraft(ctx, projectId, branchName, false)
	if err != nil {
		return err
	}
	folders := make([]string, 0)
	files := make([]*view.Content, 0)
	excludedFiles := make([]string, 0)
	filesToMoveInFolder := make(map[string]bool, 0)
	filesToDelete := make(map[string]bool, 0)
	for index, file := range branchDraft.Files {
		if file.IsFolder {
			folders = append(folders, file.FileId)
		}
		if file.Status == view.StatusExcluded {
			excludedFiles = append(excludedFiles, file.FileId)
		}
		if file.FromFolder || file.Publish || len(file.Labels) > 0 {
			continue
		}
		files = append(files, &branchDraft.Files[index])
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
		folderForExcludedFile := findFolderForFile(excludedFileId, branchDraft.Files)
		if folderForExcludedFile == "" {
			continue
		}
		fileIdsToMoveFromFolder = append(fileIdsToMoveFromFolder, findAllFilesForFolder(folderForExcludedFile, branchDraft.Files)...)
		filesToDelete[folderForExcludedFile] = true
	}
	for fileToDelete := range filesToDelete {
		fileIdsToDelete = append(fileIdsToDelete, fileToDelete)
	}

	err = b.draftRepo.UpdateFolderContents(projectId, branchName, fileIdsToDelete, fileIdsToMoveInFolder, fileIdsToMoveFromFolder)
	return err
}

func (b *branchServiceImpl) UpdateDraftConfigChangeType(ctx goctx.Context, projectId string, branchName string, changeType view.ChangeType) error {
	branchDraft, err := b.branchRepository.GetBranchDraft(projectId, branchName)
	if err != nil {
		return err
	}
	if branchDraft.ChangeType != string(changeType) {
		err = b.branchRepository.SetChangeType(projectId, branchName, string(changeType))
		if err != nil {
			return err
		}
	}
	return nil
}

func (b *branchServiceImpl) calculateDraftConfigChangeType(ctx goctx.Context, projectId string, branchName string, allowBrokenRefs bool) (view.ChangeType, error) {
	branchDraft, err := b.branchRepository.GetBranchDraft(projectId, branchName)
	if err != nil {
		return "", err
	}
	if branchDraft != nil {
		if len(branchDraft.OriginalConfig) == 0 {
			return view.CTAdded, nil
		}

		branchDetails, err := b.GetBranchDetailsFromDraft(ctx, projectId, branchName, allowBrokenRefs)
		if err != nil {
			return "", err
		}
		var originalBranchDetails view.Branch
		err = json.Unmarshal(branchDraft.OriginalConfig, &originalBranchDetails)
		if err != nil {
			return "", err
		}
		if draftConfigChanged(branchDetails, &originalBranchDetails) {
			return view.CTUpdated, nil
		}
	}
	return view.CTUnchanged, nil
}

func setFileChangeTypes(branch *view.Branch) {
	for i, file := range branch.Files {
		switch file.Status {
		case view.StatusAdded:
			branch.Files[i].ChangeType = view.CTAdded
		case view.StatusModified, view.StatusMoved:
			branch.Files[i].ChangeType = view.CTUpdated
		case view.StatusDeleted:
			branch.Files[i].ChangeType = view.CTDeleted
		default:
			branch.Files[i].ChangeType = view.CTUnchanged
		}
	}
}

func draftConfigChanged(draftBranch *view.Branch, gitBranch *view.Branch) bool {
	if (draftBranch == nil) != (gitBranch == nil) {
		return true
	}
	if draftBranch == nil {
		return false
	}

	filesFromGitConfig := map[string]view.Content{}
	for _, file := range gitBranch.Files {
		filesFromGitConfig[file.FileId] = file
	}

	for _, draftFile := range draftBranch.Files {
		gitFile, exists := filesFromGitConfig[draftFile.FileId]
		deletedFromConfig := draftFile.Status == view.StatusExcluded || draftFile.Status == view.StatusDeleted
		if draftFile.FromFolder {
			if exists {
				return true
			}
			continue
		}
		if deletedFromConfig && exists {
			return true
		}
		if deletedFromConfig && !exists {
			continue
		}
		if !exists {
			return true
		}
		if !draftFile.EqualsGitView(&gitFile) {
			return true
		}
	}

	refsFromGitConfig := map[string]view.Ref{}
	for _, ref := range gitBranch.Refs {
		if ref.IsBroken {
			continue
		}
		refsFromGitConfig[ref.RefPackageId+ref.RefPackageVersion] = ref
	}

	for _, draftRef := range draftBranch.Refs {
		if draftRef.IsBroken {
			continue
		}
		gitRef, exists := refsFromGitConfig[draftRef.RefPackageId+draftRef.RefPackageVersion]
		deletedFromConfig := draftRef.Status == view.StatusDeleted
		if deletedFromConfig && exists {
			return true
		}
		if deletedFromConfig && !exists {
			continue
		}
		if !exists {
			return true
		}
		if !draftRef.EqualsGitView(&gitRef) {
			return true
		}
	}

	return false
}

func (b *branchServiceImpl) GetBranchDetailsFromDraft(ctx goctx.Context, projectId string, branchName string, allowBrokenRefs bool) (*view.Branch, error) {
	result := view.Branch{
		ProjectId: projectId,
		Files:     make([]view.Content, 0),
		Refs:      make([]view.Ref, 0),
	}

	contents, err := b.draftRepo.GetContents(projectId, branchName)
	if err != nil {
		return nil, err
	}
	for _, content := range contents {
		result.Files = append(result.Files, *entity.MakeContentView(&content))
	}

	refs, err := b.draftRepo.GetRefs(projectId, branchName)
	if err != nil {
		return nil, err
	}
	var refIsBroken bool
	for _, ref := range refs {
		refIsBroken = false
		packageEnt, err := b.publishedRepo.GetPackage(ref.RefPackageId)
		if err != nil {
			return nil, err
		}
		if packageEnt == nil {
			if allowBrokenRefs {
				refIsBroken = true
			} else {
				return nil, &exception.CustomError{
					Status:  http.StatusNotFound,
					Code:    exception.ReferencedPackageNotFound,
					Message: exception.ReferencedPackageNotFoundMsg,
					Params:  map[string]interface{}{"package": ref.RefPackageId},
				}
			}
		}

		version, err := b.publishedRepo.GetVersion(ref.RefPackageId, ref.RefVersion)
		if err != nil {
			return nil, err
		}
		if version == nil {
			if allowBrokenRefs {
				refIsBroken = true
			} else {
				return nil, &exception.CustomError{
					Status:  http.StatusNotFound,
					Code:    exception.ReferencedPackageVersionNotFound,
					Message: exception.ReferencedPackageVersionNotFoundMsg,
					Params:  map[string]interface{}{"package": ref.RefPackageId, "version": ref.RefVersion},
				}
			}
		}
		packageName, versionStatus, packageKind := "unknown", "unknown", "unknown"
		if packageEnt != nil {
			packageName = packageEnt.Name
			packageKind = packageEnt.Kind
		}
		if version != nil {
			versionStatus = version.Status
		}
		rv := entity.MakeRefView(&ref, packageName, versionStatus, packageKind, refIsBroken)

		result.Refs = append(result.Refs, *rv)
	}

	return &result, nil
}

func (b *branchServiceImpl) GetBranchRawConfigFromDraft(ctx goctx.Context, projectId string, branchName string) ([]byte, error) {
	result := view.Branch{
		ProjectId: projectId,
		Files:     make([]view.Content, 0),
		Refs:      make([]view.Ref, 0),
	}
	draftExists, err := b.DraftExists(projectId, branchName)
	if err != nil {
		return nil, err
	}
	if !draftExists {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BranchDraftNotFound,
			Message: exception.BranchDraftNotFoundMsg,
			Params:  map[string]interface{}{"projectId": projectId, "branch": branchName},
		}
	}
	contents, err := b.draftRepo.GetContents(projectId, branchName)
	if err != nil {
		return nil, err
	}
	for _, content := range contents {
		if content.Status == string(view.StatusExcluded) || content.Status == string(view.StatusDeleted) {
			continue
		}
		result.Files = append(result.Files, *entity.MakeContentView(&content))
	}

	refs, err := b.draftRepo.GetRefs(projectId, branchName)
	if err != nil {
		return nil, err
	}
	for _, ref := range refs {
		if ref.Status == string(view.StatusDeleted) {
			continue
		}
		packageEnt, err := b.publishedRepo.GetPackage(ref.RefPackageId)
		if err != nil {
			return nil, err
		}
		if packageEnt == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.ReferencedPackageNotFound,
				Message: exception.ReferencedPackageNotFoundMsg,
				Params:  map[string]interface{}{"package": ref.RefPackageId},
			}
		}

		version, err := b.publishedRepo.GetVersion(ref.RefPackageId, ref.RefVersion)
		if err != nil {
			return nil, err
		}
		if version == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.ReferencedPackageVersionNotFound,
				Message: exception.ReferencedPackageVersionNotFoundMsg,
				Params:  map[string]interface{}{"package": ref.RefPackageId, "version": ref.RefVersion},
			}
		}

		rv := entity.MakeRefView(&ref, packageEnt.Name, version.Status, packageEnt.Kind, false)

		result.Refs = append(result.Refs, *rv)
	}
	return getApihubConfigRaw(view.TransformBranchToGitView(result))
}

func (b *branchServiceImpl) GetBranchDetailsFromGit(ctx goctx.Context, projectId string, branchName string) (*view.Branch, string, error) {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("GetBranchDetailsFromGit(%s,%s)", projectId, branchName))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return nil, "", fmt.Errorf("security context not found")
	}

	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return nil, "", err
	}

	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return nil, "", fmt.Errorf("failed to get git client: %v", err)
	}

	lastBranchCommit, err := gitClient.GetBranchOrTagLastCommitId(ctx, project.Integration.RepositoryId, branchName)
	if err != nil || lastBranchCommit == "" {
		branchExists, _, exErr := gitClient.BranchOrTagExists(ctx, project.Integration.RepositoryId, branchName)
		if exErr != nil {
			return nil, "", fmt.Errorf("failed to get last branch commit: %s", exErr)
		}
		if !branchExists {
			return nil, "", &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.BranchNotFound,
				Message: exception.BranchNotFoundMsg,
				Params:  map[string]interface{}{"projectId": projectId, "branch": branchName},
			}
		}
		return nil, "", fmt.Errorf("failed to get last branch commit: %s", err)
	}

	result, err := b.getBranchDetailsFromGitCommit(ctx, project, branchName, lastBranchCommit)
	if err != nil {
		return nil, "", err
	}
	return result, lastBranchCommit, nil
}

func (b *branchServiceImpl) GetBranchDetailsFromGitCommit(ctx goctx.Context, projectId string, branchName string, commitId string) (*view.Branch, error) {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("GetBranchDetailsFromGitCommit(%s,%s,%s)", projectId, branchName, commitId))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return nil, fmt.Errorf("security context not found")
	}

	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return nil, err
	}

	return b.getBranchDetailsFromGitCommit(ctx, project, branchName, commitId)
}

func (b *branchServiceImpl) getBranchDetailsFromGitCommit(ctx goctx.Context, project *view.Project, branchName string, commitId string) (*view.Branch, error) {
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return nil, fmt.Errorf("security context not found")
	}
	var gitBranch *view.BranchGitConfigView

	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}

	apiHubConfigPath := ApiHubBaseConfigPath + project.Id + ".json"

	configExists, err := gitClient.FileExists(ctx, project.Integration.RepositoryId, commitId, apiHubConfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to check if apihub config file exists: %v", err)
	}
	if !configExists {
		return nil, nil
	}

	data, _, _, err := gitClient.GetFileContent(ctx, project.Integration.RepositoryId, commitId, apiHubConfigPath)
	if err != nil {
		return nil, err
	}
	if data == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest, //todo maybe 404?
			Code:    exception.ConfigNotFound,
			Message: exception.ConfigNotFoundMsg,
			Params:  map[string]interface{}{"projectId": project.Id, "branch": branchName},
		}
	}
	err = json.Unmarshal(data, &gitBranch)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidApihubConfig,
			Message: exception.InvalidApihubConfigMsg,
			Debug:   err.Error(),
		}
	}

	err = b.validateGitBranchConfig(gitBranch, apiHubConfigPath)
	if err != nil {
		return nil, err
	}

	var resRefs []view.Ref
	if gitBranch.Refs == nil {
		resRefs = make([]view.Ref, 0)
	} else {
		for _, ref := range gitBranch.Refs {
			packageEnt, err := b.publishedRepo.GetPackage(ref.RefPackageId)
			if err != nil {
				return nil, err
			}
			if packageEnt == nil {
				return nil, &exception.CustomError{
					Status:  http.StatusNotFound,
					Code:    exception.ReferencedPackageNotFound,
					Message: exception.ReferencedPackageNotFoundMsg,
					Params:  map[string]interface{}{"package": project.Id},
				}
			}

			version, err := b.publishedRepo.GetVersion(ref.RefPackageId, ref.Version)
			if err != nil {
				return nil, err
			}
			if version == nil {
				return nil, &exception.CustomError{
					Status:  http.StatusNotFound,
					Code:    exception.ReferencedPackageVersionNotFound,
					Message: exception.ReferencedPackageVersionNotFoundMsg,
					Params:  map[string]interface{}{"package": project.Id, "version": ref.Version},
				}
			}
			resRefs = append(resRefs, view.TransformGitViewToRef(ref, packageEnt.Name, version.Status, entity.KIND_PACKAGE))
		}
	}

	branchDetails := view.TransformGitToBranchView(gitBranch, resRefs)
	err = b.expandBranchFolders(ctx, project.Id, commitId, branchDetails)
	if err != nil {
		return nil, err
	}
	return branchDetails, nil
}

func (b *branchServiceImpl) GetBranchRawConfigFromGit(ctx goctx.Context, projectId string, branchName string) ([]byte, error) {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("GetBranchDetailsFromGit(%s,%s)", projectId, branchName))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return nil, fmt.Errorf("security context not found")
	}

	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return nil, err
	}
	gitBranch := &view.BranchGitConfigView{
		ProjectId: projectId,
		Files:     make([]view.ContentGitConfigView, 0),
		Refs:      make([]view.RefGitConfigView, 0),
	}

	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}

	apiHubConfigPath := getApihubConfigFileId(projectId)

	configExists, err := gitClient.FileExists(ctx, project.Integration.RepositoryId, branchName, apiHubConfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to check if apihub config file exists: %v", err)
	}
	if !configExists {
		return getApihubConfigRaw(gitBranch)
	}

	data, _, _, err := gitClient.GetFileContent(ctx, project.Integration.RepositoryId, branchName, apiHubConfigPath)
	if err != nil {
		return nil, err
	}
	if data == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest, //todo maybe 404?
			Code:    exception.ConfigNotFound,
			Message: exception.ConfigNotFoundMsg,
			Params:  map[string]interface{}{"projectId": projectId, "branch": branchName},
		}
	}
	err = json.Unmarshal(data, &gitBranch)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidApihubConfig,
			Message: exception.InvalidApihubConfigMsg,
			Debug:   err.Error(),
		}
	}

	return getApihubConfigRaw(gitBranch)
}

func (b *branchServiceImpl) GetContentNoData(ctx goctx.Context, projectId string, branchName string, contentId string) (*view.Content, error) {
	content, err := b.draftRepo.GetContent(projectId, branchName, contentId)
	if err != nil {
		return nil, err
	}
	if content != nil {
		return entity.MakeContentView(content), nil
	} else {
		branchDetails, _, err := b.GetBranchDetailsFromGit(ctx, projectId, branchName)
		if err != nil {
			return nil, err
		}
		if branchDetails == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.ConfigNotFound,
				Message: exception.ConfigNotFoundMsg,
				Params:  map[string]interface{}{"projectId": projectId, "branch": branchName},
			}
		}
		branchDetails.RemoveFolders()
		for _, content := range branchDetails.Files {
			if content.FileId == contentId {
				return &content, nil
			}
		}
	}
	return nil, &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.ContentIdNotFound,
		Message: exception.ContentIdNotFoundMsg,
		Params:  map[string]interface{}{"contentId": contentId, "branch": branchName, "projectId": projectId},
	}
}

func (b *branchServiceImpl) DraftExists(projectId string, branchName string) (bool, error) {
	branchDraft, err := b.branchRepository.GetBranchDraft(projectId, branchName)
	if err != nil {
		return false, err
	}
	return branchDraft != nil, nil
}

func (b *branchServiceImpl) getBranchDraftCommitId(projectId string, branchName string) (string, error) {
	branchDraft, err := b.branchRepository.GetBranchDraft(projectId, branchName)
	if err != nil {
		return "", err
	}
	if branchDraft == nil {
		return "", nil
	}
	return branchDraft.CommitId, nil
}

func (b *branchServiceImpl) DraftContainsChanges(ctx goctx.Context, projectId string, branchName string) (bool, error) {
	configChangeType, err := b.calculateDraftConfigChangeType(ctx, projectId, branchName, true)
	if err != nil {
		return false, err
	}
	if configChangeType != view.CTUnchanged {
		return true, nil
	}

	contents, err := b.draftRepo.GetContents(projectId, branchName)
	if err != nil {
		return false, err
	}

	files := make([]view.Content, 0)
	for _, content := range contents {
		files = append(files, *entity.MakeContentView(&content))
	}

	for _, file := range files {
		if file.Status != view.StatusUnmodified {
			return true, nil
		}
	}
	return false, nil
}

func (b branchServiceImpl) BranchExists(ctx goctx.Context, projectId string, branchName string) (bool, bool, error) {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("BranchExists(%s,%s)", projectId, branchName))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return false, false, fmt.Errorf("security context not found")
	}

	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return false, false, err
	}
	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return false, false, err
	}
	exists, canPush, err := gitClient.BranchOrTagExists(ctx, project.Integration.RepositoryId, branchName)
	if err != nil {
		return false, false, err
	}
	return exists, canPush, nil
}

func (b branchServiceImpl) CloneBranch(ctx goctx.Context, projectId string, branchName string, newBranchName string) error {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("CloneBranch(%s,%s,%s)", projectId, branchName, newBranchName))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return fmt.Errorf("security context not found")
	}

	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return err
	}
	newBranchExists, _, err := b.BranchExists(ctx, projectId, newBranchName)
	if err != nil {
		return err
	}
	if newBranchExists {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BranchAlreadyExists,
			Message: exception.BranchAlreadyExistsMsg,
			Params:  map[string]interface{}{"branch": newBranchName, "projectId": projectId},
		}
	}
	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return fmt.Errorf("failed to get git client: %v", err)
	}
	return gitClient.CloneBranch(ctx, project.Integration.RepositoryId, branchName, newBranchName)
}

func (b branchServiceImpl) CreateMergeRequest(ctx goctx.Context, projectId string, targetBranchName string, sourceBranchName string, title string, description string) (string, error) {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("CreateMergeRequest(%s,%s,%s)", projectId, targetBranchName, sourceBranchName))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return "", fmt.Errorf("security context not found")
	}

	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return "", err
	}
	targetBranchExists, _, err := b.BranchExists(ctx, projectId, targetBranchName)
	if err != nil {
		return "", err
	}
	if !targetBranchExists {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BranchNotFound,
			Message: exception.BranchNotFoundMsg,
			Params:  map[string]interface{}{"branch": targetBranchName, "projectId": projectId},
		}
	}
	sourceBranchExists, _, err := b.BranchExists(ctx, projectId, sourceBranchName)
	if err != nil {
		return "", err
	}
	if !sourceBranchExists {
		return "", &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BranchNotFound,
			Message: exception.BranchNotFoundMsg,
			Params:  map[string]interface{}{"branch": sourceBranchName, "projectId": projectId},
		}
	}
	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return "", fmt.Errorf("failed to get git client: %v", err)
	}
	return gitClient.CreateMergeRequest(ctx, project.Integration.RepositoryId, targetBranchName, sourceBranchName, title, description)
}

func (b branchServiceImpl) DeleteBranch(ctx goctx.Context, projectId string, branchName string) error {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("DeleteBranch(%s,%s)", projectId, branchName))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return fmt.Errorf("security context not found")
	}

	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return err
	}
	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return fmt.Errorf("failed to get git client: %v", err)
	}
	return gitClient.DeleteBranch(ctx, project.Integration.RepositoryId, branchName)
}

func (b branchServiceImpl) ResetBranchDraft(ctx goctx.Context, projectId string, branchName string, sendResetNotification bool) error {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("ResetBranchDraft(%s,%s)", projectId, branchName))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return fmt.Errorf("security context not found")
	}

	draftExists, err := b.DraftExists(projectId, branchName)
	if err != nil {
		return err
	}
	if !draftExists {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BranchDraftNotFound,
			Message: exception.BranchDraftNotFoundMsg,
			Params:  map[string]interface{}{"projectId": projectId, "branch": branchName},
		}
	}
	err = b.DeleteBranchDraft(projectId, branchName)
	if err != nil {
		return err
	}
	if sendResetNotification {
		b.wsBranchService.NotifyProjectBranchUsers(projectId, branchName,
			websocket.BranchResetPatch{
				Type:   websocket.BranchResetType,
				UserId: (*secCtx).GetUserId(),
			})
	}

	if b.wsBranchService.HasActiveEditSession(projectId, branchName) {
		branch, err := b.GetBranchDetailsEP(ctx, projectId, branchName, true)
		if err != nil {
			b.wsBranchService.DisconnectClients(projectId, branchName)
			return err
		}
		branch.RemoveFolders()
		b.wsBranchService.NotifyProjectBranchUsers(projectId, branchName,
			websocket.BranchConfigSnapshot{
				Type: websocket.BranchConfigSnapshotType,
				Data: branch,
			})
	}
	return nil
}

func (b branchServiceImpl) DeleteBranchDraft(projectId string, branchName string) error {
	//todo do it in one transaction
	err := b.draftRepo.DeleteBranchDraft(projectId, branchName)
	if err != nil {
		return err
	}
	err = b.branchEditorsService.RemoveBranchEditors(projectId, branchName)
	if err != nil {
		return err
	}
	return nil
}

func (b branchServiceImpl) CalculateBranchConflicts(ctx goctx.Context, projectId string, branchName string) (*view.BranchConflicts, error) {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("CalculateBranchConflicts(%s,%s)", projectId, branchName))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return nil, fmt.Errorf("security context not found")
	}

	filesWithConflict := make([]string, 0)
	draftExists, err := b.DraftExists(projectId, branchName)
	if err != nil {
		return nil, err
	}
	if !draftExists {
		branchExists, _, err := b.BranchExists(ctx, projectId, branchName)
		if err != nil {
			return nil, err
		}
		if !branchExists {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.BranchNotFound,
				Message: exception.BranchNotFoundMsg,
				Params:  map[string]interface{}{"branch": branchName, "projectId": projectId},
			}
		}
		return &view.BranchConflicts{Files: make([]string, 0)}, nil
	}
	draftBranch, err := b.GetBranchDetailsFromDraft(ctx, projectId, branchName, false)
	if err != nil {
		return nil, err
	}
	draftBranch.RemoveFolders()
	if !draftExists || len(draftBranch.Files) == 0 {
		return &view.BranchConflicts{Files: filesWithConflict}, nil
	}
	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return nil, err
	}
	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}
	conflictChanges := make([]view.FileConflict, 0)
	for _, file := range draftBranch.Files {
		switch file.Status {
		case view.StatusAdded:
			{
				blobId, err := gitClient.GetFileBlobId(ctx, project.Integration.RepositoryId, branchName, file.FileId)
				if err != nil {
					return nil, err
				}
				if blobId != "" {
					filesWithConflict = append(filesWithConflict, file.FileId)
				}
				if blobId != file.ConflictedBlobId {
					conflictChanges = append(conflictChanges, view.FileConflict{FileId: file.FileId, ConflictedBlobId: blobId})
				}
			}
		case view.StatusDeleted:
			{
				if file.BlobId != "" {
					blobId, err := gitClient.GetFileBlobId(ctx, project.Integration.RepositoryId, branchName, file.FileId)
					if err != nil {
						return nil, err
					}
					if blobId != file.BlobId {
						filesWithConflict = append(filesWithConflict, file.FileId)
					}
					if file.ConflictedBlobId != blobId && blobId != file.BlobId {
						conflictChanges = append(conflictChanges, view.FileConflict{FileId: file.FileId, ConflictedBlobId: blobId})
					}
				}
				if file.BlobId == "" && file.ConflictedBlobId != "" {
					//file marked to delete no longer exists in git //todo probably never happening
					conflictChanges = append(conflictChanges, view.FileConflict{FileId: file.FileId, ConflictedBlobId: ""})
				}
			}
		case view.StatusModified:
			{
				if file.MovedFrom == "" {
					blobId, err := gitClient.GetFileBlobId(ctx, project.Integration.RepositoryId, branchName, file.FileId)
					if err != nil {
						return nil, err
					}
					if blobId != file.BlobId {
						filesWithConflict = append(filesWithConflict, file.FileId)
					}
					if file.ConflictedBlobId != "" && blobId == file.BlobId {
						conflictChanges = append(conflictChanges, view.FileConflict{FileId: file.FileId, ConflictedBlobId: ""})
					}
					if file.ConflictedBlobId != blobId && blobId != file.BlobId {
						conflictChanges = append(conflictChanges, view.FileConflict{FileId: file.FileId, ConflictedBlobId: blobId})
					}
				} else {
					fileConflict := view.FileConflict{}
					hasConflict := false

					blobIdOld, err := gitClient.GetFileBlobId(ctx, project.Integration.RepositoryId, branchName, file.MovedFrom)
					if err != nil {
						return nil, err
					}
					if blobIdOld != file.BlobId {
						hasConflict = true
					}
					if file.ConflictedBlobId != "" && blobIdOld == file.BlobId {
						fileConflict.FileId = file.FileId
						fileConflict.ConflictedBlobId = ""
					}
					if file.ConflictedBlobId != blobIdOld && blobIdOld != file.BlobId {
						fileConflict.FileId = file.FileId
						fileConflict.ConflictedBlobId = blobIdOld
					}

					blobIdNew, err := gitClient.GetFileBlobId(ctx, project.Integration.RepositoryId, branchName, file.FileId)
					if err != nil {
						return nil, err
					}
					if blobIdNew != "" {
						hasConflict = true
					}
					if file.ConflictedFileId != "" && blobIdNew == "" {
						fileConflict.FileId = file.FileId
						fileConflict.ConflictedBlobId = ""
						emptyStr := ""
						fileConflict.ConflictedFileId = &emptyStr
					}
					if file.ConflictedBlobId != blobIdNew && blobIdNew != "" {
						fileConflict.FileId = file.FileId
						fileConflict.ConflictedBlobId = blobIdNew
						fileConflict.ConflictedFileId = &file.FileId
					}

					if hasConflict {
						filesWithConflict = append(filesWithConflict, file.FileId)
					}
					if fileConflict.FileId != "" {
						conflictChanges = append(conflictChanges, fileConflict)
					}
				}
			}
		case view.StatusMoved:
			{
				fileConflict := view.FileConflict{}
				blobIdNew, err := gitClient.GetFileBlobId(ctx, project.Integration.RepositoryId, branchName, file.FileId)
				if err != nil {
					return nil, err
				}
				if blobIdNew != "" {
					filesWithConflict = append(filesWithConflict, file.FileId)
				}
				if file.ConflictedFileId != "" && blobIdNew == "" {
					fileConflict.FileId = file.FileId
					fileConflict.ConflictedBlobId = ""
					emptyStr := ""
					fileConflict.ConflictedFileId = &emptyStr
				}
				if file.ConflictedBlobId != blobIdNew && blobIdNew != "" {
					fileConflict.FileId = file.FileId
					fileConflict.ConflictedBlobId = blobIdNew
					fileConflict.ConflictedFileId = &file.FileId
				}
				if fileConflict.FileId != "" {
					conflictChanges = append(conflictChanges, fileConflict)
				}
			}
		case view.StatusUnmodified:
			continue
		}
	}
	err = b.draftRepo.UpdateContentsConflicts(projectId, branchName, conflictChanges)
	if err != nil {
		return nil, err
	}
	for _, conflictChange := range conflictChanges {
		b.wsBranchService.NotifyProjectBranchUsers(projectId, branchName,
			websocket.BranchFilesUpdatedPatch{
				Type:      websocket.BranchFilesUpdatedType,
				UserId:    (*secCtx).GetUserId(),
				FileId:    conflictChange.FileId,
				Operation: "patch",
				Data: &websocket.BranchFilesUpdatedPatchData{
					ConflictedBlobId: &conflictChange.ConflictedBlobId,
					ConflictedFileId: conflictChange.ConflictedFileId,
				},
			})
	}
	return &view.BranchConflicts{Files: filesWithConflict}, nil
}

func (b *branchServiceImpl) validateGitBranchConfig(gitBranchConfig *view.BranchGitConfigView, apiHubConfigPath string) error {
	// check duplicate file entries

	fileIds := map[string]bool{}
	duplicateIds := map[string]bool{}

	for _, fileEntry := range gitBranchConfig.Files {
		_, exists := fileIds[fileEntry.FileId]
		if !exists {
			fileIds[fileEntry.FileId] = true
		} else {
			duplicateIds[fileEntry.FileId] = true
		}
	}
	if len(duplicateIds) > 0 {
		var duplicates []string
		for id := range duplicateIds {
			duplicates = append(duplicates, id)
		}
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.GitBranchConfigContainDuplicateFiles,
			Message: exception.GitBranchConfigContainDuplicateFilesMsg,
			Params:  map[string]interface{}{"path": apiHubConfigPath, "files": fmt.Sprintf("%+q", duplicates)},
		}
	}
	return nil

	// TODO: add more validations?
}

func (b *branchServiceImpl) ConnectToWebsocket(ctx goctx.Context, projectId string, branchName string, wsId string, connection *ws.Conn) error {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("ConnectToWebsocket(%s,%s)", projectId, branchName))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return fmt.Errorf("security context not found")
	}

	err := b.wsBranchService.ConnectToProjectBranch(*secCtx, projectId, branchName, wsId, connection)
	if err != nil {
		return err
	}
	branch, err := b.GetBranchDetailsEP(ctx, projectId, branchName, true)
	if err != nil {
		b.wsBranchService.DisconnectClient(projectId, branchName, wsId)
		return err
	}
	branch.RemoveFolders()
	b.wsBranchService.NotifyProjectBranchUser(projectId, branchName, wsId,
		websocket.BranchConfigSnapshot{
			Type: websocket.BranchConfigSnapshotType,
			Data: branch,
		})

	return nil
}

func (b *branchServiceImpl) GetAllZippedContentFromGitCommit(ctx goctx.Context, branchDetails *view.Branch, projectId string, branchName string, commitId string) ([]byte, error) {
	zipBuf := bytes.Buffer{}
	zw := zip.NewWriter(&zipBuf)

	contentEntities, err := b.getBranchContentFromRepositoy(ctx, branchDetails, projectId, branchName, commitId)
	if err != nil {
		return nil, err
	}

	for _, contentEntity := range contentEntities {
		mdFw, err := zw.Create(contentEntity.FileId)
		if err != nil {
			return nil, err
		}
		if len(contentEntity.Data) == 0 {
			continue
		}
		_, err = mdFw.Write(contentEntity.Data)
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

func (b *branchServiceImpl) GetVersionPublishDetailsFromGitCommit(ctx goctx.Context, projectId string, branchName string, commitId string) (*view.GitVersionPublish, error) {
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("GetVersionPublishDetailsFromGitCommit(%s,%s,%s)", projectId, branchName, commitId))
	secCtx := context.GetSecurityContext(ctx)
	if secCtx == nil {
		return nil, fmt.Errorf("security context not found")
	}

	project, err := b.projectService.GetProject(*secCtx, projectId)
	if err != nil {
		return nil, err
	}

	var gitVersion view.GitVersionPublish
	gitClient, err := b.gitClientProvider.GetUserClient(project.Integration.Type, (*secCtx).GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}

	publishDetailsPath := getApihubVersionPublishFileId(project.Id)

	configExists, err := gitClient.FileExists(ctx, project.Integration.RepositoryId, commitId, publishDetailsPath)
	if err != nil {
		return nil, fmt.Errorf("failed to check if apihub version publish file exists: %v", err)
	}
	if !configExists {
		return nil, nil
	}

	data, _, _, err := gitClient.GetFileContent(ctx, project.Integration.RepositoryId, commitId, publishDetailsPath)
	if err != nil {
		return nil, err
	}
	if data == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.GitVersionPublishFileNotFound,
			Message: exception.GitVersionPublishFileNotFoundMsg,
			Params:  map[string]interface{}{"projectId": project.Id, "branch": branchName},
		}
	}
	err = json.Unmarshal(data, &gitVersion)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.GitVersionPublishFileInvalid,
			Message: exception.GitVersionPublishFileInvalidMsg,
			Params:  map[string]interface{}{"projectId": project.Id, "branch": branchName},
			Debug:   err.Error(),
		}
	}

	return &gitVersion, nil
}

func (b *branchServiceImpl) deleteEmptyDrafts(ctx goctx.Context) {
	drafts, err := b.branchRepository.GetBranchDrafts()
	if err != nil {
		log.Errorf("Failed to get drafts for all branches. Error: %v", err.Error())
		return
	}
	for _, draft := range drafts {
		containsChanges, err := b.DraftContainsChanges(ctx, draft.ProjectId, draft.BranchName)
		if err != nil {
			log.Errorf("Failed to check if draft for project %v branch %v contains changes. Error: %v", draft.ProjectId, draft.BranchName, err.Error())
			continue
		}
		if containsChanges || b.wsBranchService.HasActiveEditSession(draft.ProjectId, draft.BranchName) {
			continue
		}
		err = b.DeleteBranchDraft(draft.ProjectId, draft.BranchName)
		if err != nil {
			log.Errorf("Failed to delete draft for project %v branch %v. Error: %v", draft.ProjectId, draft.BranchName, err.Error())
			continue
		}
		log.Debugf("Successfully deleted draft for project %v branch %v", draft.ProjectId, draft.BranchName)
	}
}

func (b *branchServiceImpl) startCleanupJob(interval time.Duration) {
	ctx := context.CreateContextWithSecurity(goctx.Background(), context.CreateSystemContext())
	ctx = context.CreateContextWithStacktrace(ctx, fmt.Sprintf("startCleanupJob(%d)", interval))

	utils.SafeAsync(func() {
		for {
			time.Sleep(interval)
			b.deleteEmptyDrafts(ctx)
		}
	})
}

func findFolderForFile(fileId string, allFiles []view.Content) string {
	for _, file := range allFiles {
		if file.IsFolder && strings.HasPrefix(fileId, file.FileId) {
			return file.FileId
		}
	}
	return ""
}

func findAllFilesForFolder(folderFileId string, allFiles []view.Content) []string {
	filesForFolder := make([]string, 0)
	for _, file := range allFiles {
		if !file.IsFolder && file.FromFolder && strings.HasPrefix(file.FileId, folderFileId) {
			filesForFolder = append(filesForFolder, file.FileId)
		}
	}
	return filesForFolder
}
