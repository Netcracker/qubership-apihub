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
	goctx "context"
	"fmt"
	"net/http"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type GitRepoFilesService interface {
	ListFiles(ctx context.SecurityContext, projectId string, branchName string, path string, pagingParams view.PagingParams, onlyAddable bool) ([]view.FileNode, error)
}

func NewProjectFilesService(gitClientProvider GitClientProvider, repo repository.PrjGrpIntRepository, branchService BranchService) GitRepoFilesService {
	configFolder := ApiHubBaseConfigPath
	configFolder = strings.TrimPrefix(configFolder, "/")
	configFolder = strings.TrimSuffix(configFolder, "/")
	return &projectFilesServiceImpl{gitClientProvider: gitClientProvider, repo: repo, branchService: branchService, configFolder: configFolder}
}

type projectFilesServiceImpl struct {
	gitClientProvider GitClientProvider
	repo              repository.PrjGrpIntRepository
	branchService     BranchService
	configFolder      string
}

func (p projectFilesServiceImpl) ListFiles(ctx context.SecurityContext, projectId string, branchName string, path string, pagingParams view.PagingParams, onlyAddable bool) ([]view.FileNode, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("ListFiles(%s,%s,%s,%+v,%t)", projectId, branchName, path, pagingParams, onlyAddable))

	project, err := p.repo.GetById(projectId)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ProjectNotFound,
			Message: exception.ProjectNotFoundMsg,
			Params:  map[string]interface{}{"projectId": projectId},
		}
	}

	it, err := view.GitIntegrationTypeFromStr(project.IntegrationType)
	if err != nil {
		return nil, err
	}

	gitClient, err := p.gitClientProvider.GetUserClient(it, ctx.GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}

	existingFiles := map[string]bool{}
	existingFolders := []string{}
	if onlyAddable {
		branch, err := p.branchService.GetBranchDetailsEP(goCtx, projectId, branchName, false)
		if err != nil {
			return nil, err
		}
		processedPath := strings.TrimPrefix(path, "/")
		processedPath = strings.TrimSuffix(processedPath, "/")

		if branch != nil && len(branch.Files) != 0 {
			for _, bFile := range branch.Files {
				if bFile.IsFolder && strings.HasPrefix(bFile.FileId, processedPath) {
					existingFolders = append(existingFolders, bFile.FileId)
					continue
				}
				if bFile.Status != view.StatusExcluded && bFile.Status != view.StatusDeleted && strings.HasPrefix(bFile.FileId, processedPath) {
					existingFiles[bFile.FileId] = true
				}
			}
		}
	}

	files, err := gitClient.ListDirectory(goCtx, project.RepositoryId, branchName, path, pagingParams, existingFiles, existingFolders)
	if err != nil {
		return nil, err
	}

	configFolderIndex := -1
	for index, file := range files {
		if file.Name == p.configFolder {
			configFolderIndex = index
			break
		}
	}
	if configFolderIndex != -1 {
		files = append(files[:configFolderIndex], files[configFolderIndex+1:]...)
	}

	return files, nil
}
