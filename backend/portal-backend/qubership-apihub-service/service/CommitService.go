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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/websocket"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type CommitService interface {
	CommitBranchDraftChanges(ctx context.SecurityContext, projectId string, branchName string, newBranchName string, comment string, createMergeRequest bool) error
}

const (
	actionAdd    int = 1 << 0
	actionDelete int = 1 << 1
	actionModify int = 1 << 2
	movedFrom    int = 1 << 3
	movedTo      int = 1 << 4
	existsInGit  int = 1 << 5

	gitActionCreate      string = "git_create"
	gitActionUpdate      string = "git_update"
	gitActionDelete      string = "git_delete"
	gitActionNone        string = "git_no_action"
	gitActionUnsupported string = "git_unsupported_lifecycle"
)

func NewCommitService(draftRepository repository.DraftRepository,
	contentService DraftContentService,
	branchService BranchService,
	projectService ProjectService,
	gitClientProvider GitClientProvider,
	websocketService WsBranchService,
	wsFileEditService WsFileEditService,
	branchEditorsService BranchEditorsService) CommitService {
	return &commitServiceImpl{
		draftRepository:      draftRepository,
		contentService:       contentService,
		branchService:        branchService,
		projectService:       projectService,
		gitClientProvider:    gitClientProvider,
		wsBranchService:      websocketService,
		wsFileEditService:    wsFileEditService,
		branchEditorsService: branchEditorsService,
	}
}

type commitServiceImpl struct {
	draftRepository      repository.DraftRepository
	contentService       DraftContentService
	branchService        BranchService
	projectService       ProjectService
	gitClientProvider    GitClientProvider
	wsBranchService      WsBranchService
	wsFileEditService    WsFileEditService
	branchEditorsService BranchEditorsService
}

func (c *commitServiceImpl) CommitBranchDraftChanges(ctx context.SecurityContext, projectId string, branchName string, newBranchName string, comment string, createMergeRequest bool) error {
	comment = "[APIHUB] " + comment
	branchForCommit := branchName
	if newBranchName != "" {
		newBranchExists, _, err := c.branchService.BranchExists(context.CreateContextWithSecurity(goctx.Background(), ctx), projectId, newBranchName)
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
		branchForCommit = newBranchName
	}

	err := c.CommitToSpecificBranch(ctx, projectId, branchName, branchForCommit, comment)
	if err != nil {
		return err
	}
	var mrLink *string
	defer utils.SafeAsync(func() {
		c.wsBranchService.NotifyProjectBranchUsers(projectId, branchName,
			websocket.BranchSavedPatch{
				Type:            websocket.BranchSavedType,
				UserId:          ctx.GetUserId(),
				Comment:         comment,
				Branch:          newBranchName,
				MergeRequestURL: mrLink,
			})
	})
	if branchForCommit != branchName && createMergeRequest {
		mergeRequestTitle := fmt.Sprintf("[APIHUB] Resolve commit conflict via %v", branchForCommit)

		goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
		goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("CommitBranchDraftChanges(%s,%s,%s,%s,%t)", projectId, branchName, newBranchName, comment, createMergeRequest))

		mergeRequestUrl, err := c.branchService.CreateMergeRequest(goCtx, projectId, branchForCommit, branchName, mergeRequestTitle, comment)
		if err != nil {
			return err
		}
		mrLink = &mergeRequestUrl
	}

	return nil
}

func (c *commitServiceImpl) CommitToSpecificBranch(ctx context.SecurityContext, projectId string, branchName string, branchForCommit, comment string) error {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("CommitToSpecificBranch(%s,%s,%s,%s)", projectId, branchName, branchForCommit, comment))

	branchExists, canPush, err := c.branchService.BranchExists(goCtx, projectId, branchName)
	if err != nil {
		return err
	}
	if !branchExists {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.BranchNotFound,
			Message: exception.BranchNotFoundMsg,
			Params:  map[string]interface{}{"branch": branchName, "projectId": projectId},
		}
	}
	if !canPush {
		return &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientRightsToCommit,
			Message: exception.InsufficientRightsToCommitMsg,
			Params:  map[string]interface{}{"branch": branchName},
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

	builder := client.NewActionBuilder()

	draftExists, err := c.branchService.DraftExists(projectId, branchName)
	if err != nil {
		return err
	}
	if !draftExists {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BranchDraftNotFound,
			Message: exception.BranchDraftNotFoundMsg,
			Params:  map[string]interface{}{"projectId": projectId, "branch": branchName},
		}
	}
	branchDetails, err := c.branchService.GetBranchDetailsFromDraft(goCtx, projectId, branchName, false)
	if err != nil {
		return err
	}
	//remove files and refs with "status" = "excluded" from branch config
	branchDetails = removeExcluded(branchDetails)

	finalFileStates, err := getFilesLifecycle(branchDetails.Files, gitClient, project.Integration.RepositoryId, branchName)
	if err != nil {
		return err
	}

	for id, lifecycle := range finalFileStates {
		switch findFinalAction(lifecycle) {
		case gitActionUpdate:
			err = c.wsFileEditService.HandleCommitAction(projectId, branchName, id)
			if err != nil {
				return err
			}
			cwd, err := c.contentService.GetContentFromDraftOrGit(ctx, projectId, branchName, id)
			if err != nil {
				return err
			}
			builder = builder.Update(id, cwd.Data)
		case gitActionCreate:
			err = c.wsFileEditService.HandleCommitAction(projectId, branchName, id)
			if err != nil {
				return err
			}
			cwd, err := c.contentService.GetContentFromDraftOrGit(ctx, projectId, branchName, id)
			if err != nil {
				return err
			}
			builder = builder.Create(id, cwd.Data)
		case gitActionDelete:
			//err = c.wsFileEditService.HandleCommitAction(ctx, projectId, branchName, id)
			//if err != nil {
			//	return err
			//}
			builder = builder.Delete(id, []byte{})
		case gitActionUnsupported:
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.UnsupportedActionWithFile,
				Message: exception.UnsupportedActionWithFileMsg,
				Params:  map[string]interface{}{"code": lifecycle, "fileId": id},
			}
		}
	}

	apiHubConfigPath := getApihubConfigFileId(projectId)

	configExists, err := gitClient.FileExists(goCtx, project.Integration.RepositoryId, branchName, apiHubConfigPath)
	if err != nil {
		return err
	}

	//remove files with "status" = "deleted" from branch config
	branchDetails = removeDeletedFiles(branchDetails)
	draftJson, err := getApihubConfigRaw(view.TransformBranchToGitView(*branchDetails))
	if err != nil {
		return err
	}
	if !configExists {
		builder = builder.Create(apiHubConfigPath, draftJson)
	} else {
		builder = builder.Update(apiHubConfigPath, draftJson)
	}

	err = gitClient.CommitChanges(goCtx, project.Integration.RepositoryId, branchName, branchForCommit, comment, builder.Build())
	if err != nil {
		return err
	}
	err = c.branchService.ResetBranchDraft(goCtx, projectId, branchName, false)
	if err != nil {
		return err
	}

	return nil
}

func removeExcluded(branch *view.Branch) *view.Branch {
	resFiles := make([]view.Content, 0)
	resRefs := make([]view.Ref, 0)

	for _, f := range branch.Files {
		if f.Status != view.StatusExcluded {
			resFiles = append(resFiles, f)
		}
	}

	for _, r := range branch.Refs {
		if r.Status != view.StatusDeleted {
			resRefs = append(resRefs, r)
		}
	}
	branch.Files = resFiles
	branch.Refs = resRefs
	return branch
}

func removeDeletedFiles(branch *view.Branch) *view.Branch {
	resFiles := make([]view.Content, 0)

	for _, f := range branch.Files {
		if f.Status != view.StatusDeleted {
			resFiles = append(resFiles, f)
		}
	}
	branch.Files = resFiles
	return branch
}

func getFilesLifecycle(files []view.Content, gitClient client.GitClient, repId string, branchName string) (map[string]int, error) {
	fileHistory := map[string]int{}
	for _, file := range files {
		if file.Status == view.StatusUnmodified || file.IsFolder {
			continue
		}
		initValues(fileHistory, file.FileId)

		// TODO: should be context from the request
		goCtx := context.CreateContextWithStacktrace(goctx.Background(), fmt.Sprintf("getFilesLifecycle(%s,%s)", repId, branchName))

		gitFileExists, err := gitClient.FileExists(goCtx, repId, branchName, file.FileId)
		if err != nil {
			return nil, err
		}

		if gitFileExists {
			fileHistory[file.FileId] = fileHistory[file.FileId] | existsInGit
		}

		switch file.Status {
		case view.StatusAdded:
			{
				fileHistory[file.FileId] = fileHistory[file.FileId] | actionAdd
			}
		case view.StatusDeleted:
			{
				if file.LastStatus == "" {
					continue
				}

				fileHistory[file.FileId] = fileHistory[file.FileId] | actionDelete

				gitFileExists, err = gitClient.FileExists(goCtx, repId, branchName, file.FileId)
				if err != nil {
					return nil, err
				}
				if gitFileExists {
					fileHistory[file.FileId] = fileHistory[file.FileId] | existsInGit
				}
			}
		case view.StatusModified, view.StatusMoved:
			{

				if file.MovedFrom != "" {
					initValues(fileHistory, file.MovedFrom)
					fileHistory[file.FileId] = fileHistory[file.FileId] | movedTo
					fileHistory[file.MovedFrom] = fileHistory[file.MovedFrom] | movedFrom

					gitFileExists, err = gitClient.FileExists(goCtx, repId, branchName, file.MovedFrom)
					if err != nil {
						return nil, err
					}
					if gitFileExists {
						fileHistory[file.MovedFrom] = fileHistory[file.MovedFrom] | existsInGit
					}
				} else {
					fileHistory[file.FileId] = fileHistory[file.FileId] | actionModify
				}
			}
		}
	}
	return fileHistory, nil
}

func initValues(mp map[string]int, key string) {
	_, exists := mp[key]
	if !exists {
		mp[key] = 0
	}
}

func findFinalAction(actions int) string {
	switch actions {
	case actionAdd | movedFrom | existsInGit:
		return gitActionUpdate
	case actionAdd | movedFrom:
		return gitActionCreate
	case actionAdd | existsInGit:
		return gitActionUpdate
	case actionAdd:
		return gitActionCreate
	case actionModify | movedFrom | existsInGit:
		return gitActionUpdate
	case actionModify | movedFrom:
		return gitActionCreate
	case actionModify | existsInGit:
		return gitActionUpdate
	case actionModify:
		return gitActionCreate
	case movedFrom | movedTo | existsInGit:
		return gitActionUpdate
	case movedFrom | movedTo:
		return gitActionCreate
	case movedFrom | existsInGit:
		return gitActionDelete
	case movedFrom:
		return gitActionNone
	case movedTo | existsInGit:
		return gitActionUpdate
	case movedTo:
		return gitActionCreate
	case actionDelete | existsInGit:
		return gitActionDelete
	case actionDelete:
		return gitActionNone
	case existsInGit:
		return gitActionNone
	case 0:
		return gitActionNone
	default:
		return gitActionUnsupported
	}
}
