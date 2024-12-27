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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type SearchService interface {
	GetFilteredProjects(ctx context.SecurityContext, filter string, groupId string, onlyFavorite bool, onlyPublished bool, limit int, page int) (*view.Projects, error)
	// check
	GetFilteredPackages(ctx context.SecurityContext, filter string, groupId string, onlyFavorite bool, onlyPublished bool) (*view.Packages_deprecated, error)
	// check
	GetPackagesByServiceName(ctx context.SecurityContext, serviceName string) (*view.Packages_deprecated, error)
	GetProjectBranches(ctx context.SecurityContext, projectId string, filter string) (*view.BranchListView, error)
	GetContentHistory(ctx context.SecurityContext, projectId string, branchName string, fileId string, limit int, page int) (*view.Changes, error)
	GetContentFromCommit(ctx context.SecurityContext, projectId string, branchName string, fileId string, commitId string) ([]byte, error)
	GetContentFromBlobId(ctx context.SecurityContext, projectId string, blobId string) ([]byte, error)
	GetBranchHistory_deprecated(ctx context.SecurityContext, projectId string, branchName string, limit int, page int) (*view.Changes, error)
	GetPackage(ctx context.SecurityContext, id string) (*view.Package, error) //todo remove this method
}

func NewSearchService(projectService ProjectService,
	versionService PublishedService,
	branchService BranchService,
	gitClientProvider GitClientProvider,
	draftContentService DraftContentService) SearchService {
	return &searchServiceImpl{
		projectService:      projectService,
		versionService:      versionService,
		branchService:       branchService,
		gitClientProvider:   gitClientProvider,
		draftContentService: draftContentService}
}

type searchServiceImpl struct {
	projectService      ProjectService
	versionService      PublishedService
	branchService       BranchService
	gitClientProvider   GitClientProvider
	draftContentService DraftContentService
}

func (s searchServiceImpl) GetFilteredProjects(ctx context.SecurityContext, filter string, groupId string, onlyFavorite bool, onlyPublished bool, limit int, page int) (*view.Projects, error) {
	projects, err := s.projectService.GetFilteredProjects(ctx, filter, groupId, onlyFavorite)
	if err != nil {
		return nil, err
	}
	filteredProjects := make([]view.Project, 0)
	if !onlyPublished {
		filteredProjects = projects
	} else {
		for _, project := range projects {
			published, err := s.versionService.PackagePublished(project.PackageId)
			if err != nil {
				return nil, err
			}
			if published {
				filteredProjects = append(filteredProjects, project)
			}
		}
	}
	startIndex, endIndex := utils.PaginateList(len(filteredProjects), limit, page)
	pagedChanges := filteredProjects[startIndex:endIndex]
	return &view.Projects{Projects: pagedChanges}, nil
}

func (s searchServiceImpl) GetFilteredPackages(ctx context.SecurityContext, filter string, groupId string, onlyFavorite bool, onlyPublished bool) (*view.Packages_deprecated, error) {
	packages, err := s.versionService.GetFilteredPackages(ctx, filter, groupId, onlyFavorite)
	if err != nil {
		return nil, err
	}
	filteredPackages := make([]view.Package, 0)
	if !onlyPublished {
		filteredPackages = packages
	} else {
		for _, pkg := range packages {
			published, err := s.versionService.PackagePublished(pkg.Id)
			if err != nil {
				return nil, err
			}
			if published {
				filteredPackages = append(filteredPackages, pkg)
			}
		}
	}
	return &view.Packages_deprecated{Packages: filteredPackages}, nil
}

func (s searchServiceImpl) GetPackagesByServiceName(ctx context.SecurityContext, serviceName string) (*view.Packages_deprecated, error) {
	packages, err := s.versionService.GetPackagesByServiceName(ctx, serviceName)
	if err != nil {
		return nil, err
	}
	return &view.Packages_deprecated{Packages: packages}, nil
}

func (s searchServiceImpl) GetProjectBranches(ctx context.SecurityContext, projectId string, filter string) (*view.BranchListView, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetProjectBranches(%s,%s)", projectId, filter))

	project, err := s.projectService.GetProject(ctx, projectId)
	if err != nil {
		return nil, err
	}
	limit := 20

	branches, err := s.branchService.GetProjectBranchesFromGit(goCtx, projectId, filter, limit)
	if err != nil {
		return nil, err
	}
	if len(branches) == 0 {
		return &view.BranchListView{Branches: []view.BranchItemView{}}, nil
	}
	if project.PackageId == "" {
		return &view.BranchListView{Branches: branches}, nil
	}

	versionsObj, err := s.versionService.GetPackageVersions(project.PackageId)
	if err != nil {
		return nil, err
	}
	versions := versionsObj.Versions
	var result []view.BranchItemView

	for _, branch := range branches {
		for _, version := range versions {
			if version.BranchName == branch.Name {
				tempPublishedAt := version.PublishedAt
				branch.PublishedAt = &tempPublishedAt
				branch.Status = version.Status
				branch.Version = version.Version
				break
			}
		}
		result = append(result, branch)
	}
	return &view.BranchListView{Branches: result}, nil
}

func (s searchServiceImpl) GetContentHistory(ctx context.SecurityContext, projectId string, branchName string, fileId string, limit int, page int) (*view.Changes, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetContentHistory(%s,%s,%s,%d,%d)", projectId, branchName, fileId, limit, page))

	project, err := s.projectService.GetProject(ctx, projectId)
	if err != nil {
		return nil, err
	}
	gitClient, err := s.gitClientProvider.GetUserClient(project.Integration.Type, ctx.GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}
	gitCommits, err := gitClient.GetCommitsList(goCtx, project.Integration.RepositoryId, branchName, fileId)
	if err != nil {
		return nil, err
	}
	if len(gitCommits) == 0 {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.FileNotFound,
			Message: exception.FileNotFoundMsg,
			Params:  map[string]interface{}{"fileId": fileId, "branch": branchName, "projectGitId": projectId},
		}
	}

	changes, err := s.getChangesFromCommits(gitCommits)
	if err != nil {
		return nil, err
	}
	startIndex, endIndex := utils.PaginateList(len(changes), limit, page)
	pagedChanges := changes[startIndex:endIndex]
	return &view.Changes{Changes: pagedChanges}, nil
}

func (s searchServiceImpl) GetBranchHistory_deprecated(ctx context.SecurityContext, projectId string, branchName string, limit int, page int) (*view.Changes, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetBranchHistory(%s,%s,%d,%d)", projectId, branchName, limit, page))

	project, err := s.projectService.GetProject(ctx, projectId)
	if err != nil {
		return nil, err
	}
	branch, err := s.branchService.GetBranchDetails(goCtx, projectId, branchName)
	if err != nil {
		return nil, err
	}
	branch.RemoveFolders()
	gitClient, err := s.gitClientProvider.GetUserClient(project.Integration.Type, ctx.GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}
	changes := []view.FileChange{}
	branchCommits := map[string]bool{}
	for _, content := range branch.Files {
		gitCommits, err := gitClient.GetCommitsList(goCtx, project.Integration.RepositoryId, branchName, content.FileId)
		if err != nil {
			continue
		}
		commitsChanges, err := s.getChangesFromCommits(gitCommits)
		if err != nil {
			return nil, err
		}
		//filter duplicates
		for _, change := range commitsChanges {
			if _, exists := branchCommits[change.CommitId]; !exists {
				branchCommits[change.CommitId] = true
				changes = append(changes, change)
			}
		}
	}
	startIndex, endIndex := utils.PaginateList(len(changes), limit, page)
	pagedChanges := changes[startIndex:endIndex]
	return &view.Changes{Changes: pagedChanges}, nil
}

func (s searchServiceImpl) GetContentFromCommit(ctx context.SecurityContext, projectId string, branchName string, fileId string, commitId string) ([]byte, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetContentFromCommit(%s,%s,%s,%s)", projectId, branchName, fileId, commitId))

	project, err := s.projectService.GetProject(ctx, projectId)
	if err != nil {
		return nil, err
	}
	gitClient, err := s.gitClientProvider.GetUserClient(project.Integration.Type, ctx.GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}

	var content []byte
	var gitRef string
	if commitId == "latest" {
		// get file from latest commit in branch
		gitRef = branchName
	} else {
		// get file from exact commit
		gitRef = commitId
	}
	content, _, _, err = gitClient.GetFileContent(goCtx, project.Integration.RepositoryId, gitRef, fileId)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.FileByRefNotFound,
			Message: exception.FileByRefNotFoundMsg,
			Params:  map[string]interface{}{"fileId": fileId, "ref": gitRef, "projectGitId": projectId},
		}
	}
	return content, nil
}

func (s searchServiceImpl) GetContentFromBlobId(ctx context.SecurityContext, projectId string, blobId string) ([]byte, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("GetContentFromBlobId(%s,%s)", projectId, blobId))

	project, err := s.projectService.GetProject(ctx, projectId)
	if err != nil {
		return nil, err
	}
	gitClient, err := s.gitClientProvider.GetUserClient(project.Integration.Type, ctx.GetUserId())
	if err != nil {
		return nil, fmt.Errorf("failed to get git client: %v", err)
	}

	var content []byte
	content, _, err = gitClient.GetFileContentByBlobId(goCtx, project.Integration.RepositoryId, blobId)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.FileByBlobIdNotFound,
			Message: exception.FileByBlobIdNotFoundMsg,
			Params:  map[string]interface{}{"blobId": blobId, "projectGitId": project.Integration.RepositoryId},
		}
	}
	return content, nil
}

func (s searchServiceImpl) getChangesFromCommits(gitCommits []view.GitCommit) ([]view.FileChange, error) {
	changes := []view.FileChange{}
	for _, commit := range gitCommits {
		changes = append(changes, view.FileChange{
			CommitId: commit.Id,
			ModifiedBy: view.User{
				//TODO maybe can be extended by getting AvatarUrl from integration
				Name:  commit.CommitterName,
				Email: commit.CommitterEmail,
			},
			ModifiedAt: commit.CommittedDate,
			Comment:    commit.Message})
	}
	return changes, nil
}

// todo remove this method
func (s searchServiceImpl) GetPackage(ctx context.SecurityContext, id string) (*view.Package, error) {
	pkg, err := s.versionService.GetPackageById(ctx, id)
	if err != nil {
		return nil, err
	}
	return pkg, nil
}
