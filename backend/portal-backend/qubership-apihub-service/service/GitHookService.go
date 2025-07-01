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
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
	"github.com/xanzy/go-gitlab"
)

type GitHookService interface {
	SetGitLabToken(ctx context.SecurityContext, projectId string, token string) error
	HandleGitLabEvent(eventType gitlab.EventType, event interface{}, token string) ([]view.PublishV2Response, error)
}

func NewGitHookService(projectRepo repository.PrjGrpIntRepository, branchService BranchService, buildService BuildService, userService UserService) GitHookService {
	return &gitHookService{
		projectRepo:   projectRepo,
		branchService: branchService,
		buildService:  buildService,
		userService:   userService,
	}
}

type gitHookService struct {
	projectRepo   repository.PrjGrpIntRepository
	branchService BranchService
	buildService  BuildService
	userService   UserService
}

func (s gitHookService) SetGitLabToken(ctx context.SecurityContext, projectId string, token string) error {
	existingPrj, err := s.projectRepo.GetById(projectId)
	if err != nil {
		return err
	}
	if existingPrj == nil {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ProjectNotFound,
			Message: exception.ProjectNotFoundMsg,
			Params:  map[string]interface{}{"projectId": projectId},
		}
	}
	existingPrj.SecretToken = token
	existingPrj.SecretTokenUserId = ctx.GetUserId()
	_, err = s.projectRepo.Update(existingPrj)
	return err
}

func (s gitHookService) HandleGitLabEvent(eventType gitlab.EventType, event interface{}, token string) ([]view.PublishV2Response, error) {
	switch e := event.(type) {
	case *gitlab.PushEvent:
		log.Debugf("Parsed push event: %v", *e)
		wrappedEvent, err := s.newGitlabPushEventWrapper(e, token)
		if err != nil {
			return nil, err
		}
		return s.handleGitLabBranchUpdated(wrappedEvent)
	case *gitlab.TagEvent:
		log.Debugf("Parsed tag event: %v", *e)
		wrappedEvent, err := s.newGitlabTagEventWrapper(e, token)
		if err != nil {
			return nil, err
		}
		return s.handleGitLabBranchUpdated(wrappedEvent)
	default:
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.GitIntegrationUnsupportedHookEventType,
			Message: exception.GitIntegrationUnsupportedHookEventTypeMsg,
			Params: map[string]interface{}{
				"type": string(eventType),
			},
		}
	}
}

func (s gitHookService) handleGitLabBranchUpdated(e gitlabEventWrapper) ([]view.PublishV2Response, error) {
	projects, err := s.projectRepo.GetProjectsForIntegration(string(view.GitlabIntegration), strconv.Itoa(e.getGitlabProjectId()), e.getToken())
	if err != nil {
		return nil, err
	}

	result := []view.PublishV2Response{}
	log.Debugf("Found %v projects", len(projects))
	for _, project := range projects {
		userId := e.getUserId(project.SecretTokenUserId)
		log.Debugf("Creating user context for project %q with userId %q", project.Id, userId)
		usrCtx := context.CreateFromId(userId)

		goCtx := context.CreateContextWithSecurity(goctx.Background(), usrCtx)
		goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("handleGitLabBranchUpdated(%s)", e.String()))

		log.Debugf("Getting branch details from git for project %+v, branch %s", project.Id, e.getBranch())
		branchDetails, err := s.branchService.GetBranchDetailsFromGitCommit(goCtx, project.Id, e.getBranch(), e.getCommitId())
		if err != nil {
			return nil, err
		}
		if branchDetails == nil {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.ConfigNotFound,
				Message: exception.ConfigNotFoundMsg,
				Params:  map[string]interface{}{"projectId": project.Id, "branch": e.getBranch()},
			}
		}
		log.Debugf("Branch details %+v", *branchDetails)

		if !e.shouldPublish(branchDetails) {
			log.Debugf("Publish is not required")
			continue
		}

		log.Debugf("Getting version publish details from git for project %+v, branch %s", project.Id, e.getBranch())
		publishDetails, err := s.branchService.GetVersionPublishDetailsFromGitCommit(goCtx, project.Id, e.getBranch(), e.getCommitId())
		if err != nil {
			return nil, err
		}
		if publishDetails != nil {
			log.Debugf("Version publish details: %+v", *publishDetails)
		}

		buildConfig, err := e.getBuildConfig(&project, branchDetails, publishDetails, e.getBranch(), userId)
		if err != nil {
			return nil, err
		}
		log.Debugf("Build Config created from branch details %+v", buildConfig)
		src, err := s.branchService.GetAllZippedContentFromGitCommit(goCtx, branchDetails, project.Id, e.getBranch(), e.getCommitId())
		if err != nil {
			return nil, err
		}
		resp, err := s.buildService.PublishVersion(usrCtx, *buildConfig, src, false, "", nil, false, false)
		if err != nil {
			return nil, err
		}
		log.Debugf("Publish response: %+v", *resp)
		result = append(result, *resp)
	}
	return result, nil
}

func (s gitHookService) getUserId(eventUser, eventEmail string) (string, error) {
	users, err := s.userService.GetUsersByIds([]string{eventUser})
	if err != nil {
		return "", err
	}
	if len(users) > 0 {
		return users[0].Id, nil
	}
	user, err := s.userService.GetUserByEmail(eventEmail)
	if err != nil {
		return "", err
	}
	if user != nil {
		return user.Id, nil
	}
	return "", nil
}

func ContentsToBCFiles(branchContent []view.Content) []view.BCFile {
	result := []view.BCFile{}
	for i := range branchContent {
		result = append(result, view.BCFile{
			FileId:  branchContent[i].FileId,
			Publish: &branchContent[i].Publish,
			Labels:  branchContent[i].Labels,
			BlobId:  branchContent[i].BlobId,
		})
	}
	return result
}

func RefsToBCRefs(refs []view.Ref) []view.BCRef {
	result := []view.BCRef{}
	for _, r := range refs {
		result = append(result, view.BCRef{
			RefId:   r.RefPackageId,
			Version: r.RefPackageVersion,
		})
	}
	return result
}

type gitlabEventWrapper interface {
	getToken() string
	getGitlabProjectId() int
	getBranch() string
	getCommitId() string
	getUserId(defaultUrerId string) string
	shouldPublish(branchDetails *view.Branch) bool
	getBuildConfig(project *entity.ProjectIntEntity, branchDetails *view.Branch,
		versionPublishDetails *view.GitVersionPublish, branch, userId string) (*view.BuildConfig, error)
	String() string
}

type gitlabTagEventWrapper struct {
	event    *gitlab.TagEvent
	token    string
	branch   string
	commitId string
	userId   string
}

func (s *gitHookService) newGitlabTagEventWrapper(event *gitlab.TagEvent, token string) (gitlabEventWrapper, error) {
	userId, err := s.getUserId(event.UserUsername, event.UserEmail)
	if err != nil {
		return nil, err
	}
	return &gitlabTagEventWrapper{
		event:    event,
		token:    token,
		branch:   strings.TrimPrefix(event.Ref, "refs/tags/"),
		commitId: event.After,
		userId:   userId,
	}, nil
}

func (w gitlabTagEventWrapper) getToken() string {
	return w.token
}

func (w gitlabTagEventWrapper) getGitlabProjectId() int {
	return w.event.ProjectID
}

func (w gitlabTagEventWrapper) getBranch() string {
	return w.branch
}

func (w gitlabTagEventWrapper) getCommitId() string {
	return w.commitId
}

func (w gitlabTagEventWrapper) getUserId(defaultUrerId string) string {
	if w.userId == "" {
		return defaultUrerId
	}
	return w.userId
}

func (w gitlabTagEventWrapper) shouldPublish(branchDetails *view.Branch) bool {
	return true
}

func (w gitlabTagEventWrapper) getBuildConfig(project *entity.ProjectIntEntity, branchDetails *view.Branch,
	versionPublishDetails *view.GitVersionPublish, branch, userId string) (*view.BuildConfig, error) {
	return &view.BuildConfig{
		PackageId: project.PackageId,
		Version:   branch,
		BuildType: view.PublishType,
		Status:    string(view.Draft),
		CreatedBy: userId,
		Refs:      RefsToBCRefs(branchDetails.Refs),
		Files:     ContentsToBCFiles(branchDetails.Files),
		Metadata: view.BuildConfigMetadata{
			BranchName:    branch,
			RepositoryUrl: project.RepositoryUrl,
		},
	}, nil
}

func (w gitlabTagEventWrapper) String() string {
	return fmt.Sprintf("gitlabEventWrapper{Type: %s, Branch: %s, Commit: %s, UserId: %s}", gitlab.EventTypeTagPush, w.branch, w.commitId, w.userId)
}

type gitlabPushEventWrapper struct {
	event        *gitlab.PushEvent
	token        string
	branch       string
	commitId     string
	userId       string
	changedFiles map[string]struct{}
}

func (s *gitHookService) newGitlabPushEventWrapper(event *gitlab.PushEvent, token string) (gitlabEventWrapper, error) {
	userId, err := s.getUserId(event.UserUsername, event.UserEmail)
	if err != nil {
		return nil, err
	}
	result := &gitlabPushEventWrapper{
		event:    event,
		token:    token,
		branch:   strings.TrimPrefix(event.Ref, "refs/heads/"),
		commitId: event.After,
		userId:   userId,
	}
	result.calculateChangedFiles()
	return result, nil
}

func (w gitlabPushEventWrapper) getToken() string {
	return w.token
}

func (w gitlabPushEventWrapper) getGitlabProjectId() int {
	return w.event.ProjectID
}

func (w gitlabPushEventWrapper) getBranch() string {
	return w.branch
}

func (w gitlabPushEventWrapper) getCommitId() string {
	return w.commitId
}

func (w gitlabPushEventWrapper) getUserId(defaultUrerId string) string {
	if w.userId == "" {
		return defaultUrerId
	}
	return w.userId
}

func (w gitlabPushEventWrapper) shouldPublish(branchDetails *view.Branch) bool {
	if _, ok := w.changedFiles[getApihubConfigFileId(branchDetails.ProjectId)]; ok {
		return true
	}
	if _, ok := w.changedFiles[getApihubVersionPublishFileId(branchDetails.ProjectId)]; ok {
		return true
	}
	for _, file := range branchDetails.Files {
		if _, ok := w.changedFiles[file.FileId]; ok {
			return true
		}
	}
	return false
}

func (w *gitlabPushEventWrapper) calculateChangedFiles() {
	var paths []string
	w.changedFiles = map[string]struct{}{}
	if w.event.TotalCommitsCount == 0 {
		return
	}
	for _, commit := range w.event.Commits {
		paths = append(paths, commit.Added...)
		paths = append(paths, commit.Modified...)
		paths = append(paths, commit.Removed...)
	}
	for _, path := range paths {
		if _, ok := w.changedFiles[path]; !ok {
			w.changedFiles[path] = struct{}{}
		}
	}
}

func (w gitlabPushEventWrapper) getBuildConfig(project *entity.ProjectIntEntity, branchDetails *view.Branch,
	versionPublishDetails *view.GitVersionPublish, branch, userId string) (*view.BuildConfig, error) {

	packageId := project.PackageId
	version := branch
	previousVersion := ""
	previousVersionPackageId := ""
	status := string(view.Draft)
	if versionPublishDetails != nil {
		if versionPublishDetails.PackageId != packageId {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.GitVersionPublishFileInvalid,
				Message: exception.GitVersionPublishFileInvalidMsg,
				Params:  map[string]interface{}{"projectId": project.Id, "branch": branch},
				Debug:   "packageId doesn't match with packageId on project",
			}
		}
		version = versionPublishDetails.Version
		previousVersion = versionPublishDetails.PreviousVersion
		previousVersionPackageId = versionPublishDetails.PreviousVersionPackageId
		status = versionPublishDetails.Status
	}
	return &view.BuildConfig{
		PackageId:                packageId,
		Version:                  version,
		PreviousVersion:          previousVersion,
		PreviousVersionPackageId: previousVersionPackageId,
		BuildType:                view.PublishType,
		Status:                   status,
		CreatedBy:                userId,
		Refs:                     RefsToBCRefs(branchDetails.Refs),
		Files:                    ContentsToBCFiles(branchDetails.Files),
		Metadata: view.BuildConfigMetadata{
			BranchName:    branch,
			RepositoryUrl: project.RepositoryUrl,
		},
	}, nil
}

func (w gitlabPushEventWrapper) String() string {
	return fmt.Sprintf("gitlabEventWrapper{Type: %s, Branch: %s, Commit: %s, UserId: %s}", gitlab.EventTypePush, w.branch, w.commitId, w.userId)
}
