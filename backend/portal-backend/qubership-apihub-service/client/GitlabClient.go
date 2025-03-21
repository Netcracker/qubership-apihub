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

package client

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"

	"golang.org/x/time/rate"

	actx "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
	"github.com/xanzy/go-gitlab"
)

func NewGitlabOauthClient(gitlabUrl, accessToken string, userId string, tokenRevocationHandler TokenRevocationHandler, tokenExpirationHandler TokenExpirationHandler) (GitClient, error) {
	if gitlabUrl == "" {
		return nil, fmt.Errorf("parameter %s can't be blank", "gitlabUrl")
	}
	if accessToken == "" {
		return nil, fmt.Errorf("parameter %s can't be blank", "accessToken")
	}

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	httpClient := &http.Client{Transport: tr}

	client, err := gitlab.NewOAuthClient(accessToken, gitlab.WithBaseURL(gitlabUrl+"/api/v4"), gitlab.WithHTTPClient(httpClient))
	if err != nil {
		return nil, err
	}
	version, response, err := client.Version.GetVersion()
	if err != nil {
		if tokenExpired(err) {
			accessToken, _, expError := tokenExpirationHandler.TokenExpired(userId, view.GitlabIntegration)
			if expError != nil {
				return nil, expError
			}
			client, err = gitlab.NewOAuthClient(accessToken, gitlab.WithBaseURL(gitlabUrl+"/api/v4"))
			if err != nil {
				return nil, err
			}
			version, _, err = client.Version.GetVersion()
		}

		if tokenIsRevoked(err) {
			return nil, tokenRevocationHandler.TokenRevoked(userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		if response.StatusCode == http.StatusUnauthorized {
			return nil, tokenRevocationHandler.AuthFailed(userId, view.GitlabIntegration)
		}

		return nil, errors.New("Failed to check connection to gitlab, error: " + err.Error())
	}
	log.Debugf("Connection to gitlab established, server version: %s %s", version.Version, version.Revision)
	return &gitlabClientImpl{
		client:                 client,
		userId:                 userId,
		tokenRevocationHandler: tokenRevocationHandler,
		tokenExpirationHandler: tokenExpirationHandler,
		ctx:                    context.TODO(),
		rateLimiter:            rate.NewLimiter(50, 1), // x requests per second
	}, nil
}

type gitlabClientImpl struct {
	client                 *gitlab.Client
	userId                 string
	tokenRevocationHandler TokenRevocationHandler
	tokenExpirationHandler TokenExpirationHandler
	ctx                    context.Context
	rateLimiter            *rate.Limiter
}

const DefaultContextTimeout = time.Second * 20

func (c gitlabClientImpl) SearchRepositories(ctx context.Context, search string, limit int) ([]view.GitRepository, []view.GitGroup, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, nil, err
	}

	var gitRepoCoordinates *GitRepoCoordinates

	isGitUrl := isGitRepoUrl(search)
	if isGitUrl {
		gitRepoCoordinates, err = parseGitRepoUrl(search)
	} else {
		gitRepoCoordinates = &GitRepoCoordinates{
			name: search,
		}
	}
	searchNamespaces := false
	var projectGroup string
	var projectName string
	if strings.Contains(gitRepoCoordinates.name, "/") {
		searchNamespaces = true
		projectFullPath := strings.Trim(gitRepoCoordinates.name, "/")
		if strings.Contains(projectFullPath, "/") {
			projectGroup = path.Dir(projectFullPath)
			projectName = path.Base(projectFullPath)
		}
	}

	orderStr := "last_activity_at"
	simple := true
	options := &gitlab.ListProjectsOptions{
		Search:           &gitRepoCoordinates.name,
		OrderBy:          &orderStr,
		Simple:           &simple,
		SearchNamespaces: &searchNamespaces,
	}
	options.ListOptions = gitlab.ListOptions{PerPage: limit * 2}

	gitRepositories := make([]view.GitRepository, 0)
	gitRepositoryMap := make(map[string]bool)
	gitGroups := make([]view.GitGroup, 0)
	gitGroupMap := make(map[string]bool)

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()

	projects, response, err := c.client.Projects.ListProjects(options, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, nil, GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return nil, nil, expErr
		}
		if tokenIsRevoked(err) {
			return nil, nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, nil, GitlabDeadlineExceeded(err)
		}
		return nil, nil, err
	}

	if isGitUrl {
		for _, prj := range projects {
			if prj.HTTPURLToRepo == search {
				projectIdStr := strconv.Itoa(prj.ID)
				gitRepositories = append(gitRepositories, view.GitRepository{RepositoryId: projectIdStr, Name: prj.PathWithNamespace, DefaultBranch: prj.DefaultBranch})
				return gitRepositories, gitGroups, nil
			}
		}
	} else {
		for _, prj := range projects {
			if strings.Contains(strings.ToLower(prj.PathWithNamespace), strings.ToLower(search)) ||
				strings.Contains(strings.ToLower(prj.NameWithNamespace), strings.ToLower(search)) { // TODO: maybe use path with namespace
				projectIdStr := strconv.Itoa(prj.ID)
				gitRepositories = append(gitRepositories, view.GitRepository{RepositoryId: projectIdStr, Name: prj.PathWithNamespace, DefaultBranch: prj.DefaultBranch})
				gitRepositoryMap[projectIdStr] = true
				if len(gitRepositories) >= limit {
					break
				}
			}
		}
	}

	if projectGroup != "" && projectGroup != "/" && projectGroup != "." {
		projectsToFill := limit - len(gitRepositories)
		projectsFromGroup, err := c.getProjectsFromGroup(ctx, projectName, projectGroup, projectsToFill)
		if err != nil {
			return nil, nil, err
		}
		for _, prj := range projectsFromGroup {
			if !gitRepositoryMap[prj.RepositoryId] {
				gitRepositories = append(gitRepositories, prj)
			}
		}
	}

	groupsToFill := limit - len(gitRepositories)
	if groupsToFill > 0 {
		groups, err := c.getGroups(ctx, gitRepoCoordinates.name, groupsToFill)
		if err != nil {
			return nil, nil, err
		}
		for _, grp := range groups {
			gitGroupMap[grp.Name] = true
		}
		gitGroups = append(gitGroups, groups...)
		namespacesToFill := groupsToFill - len(gitGroups)
		if namespacesToFill > 0 {
			namespaces, err := c.getNamespaces(ctx, gitRepoCoordinates.name, namespacesToFill)
			if err != nil {
				return nil, nil, err
			}
			for _, ns := range namespaces {
				if !gitGroupMap[ns.Name] {
					gitGroups = append(gitGroups, ns)
				}
			}
		}
	}

	return gitRepositories, gitGroups, nil
}

func (c gitlabClientImpl) getProjectsFromGroup(ctx context.Context, search string, group string, limit int) ([]view.GitRepository, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]view.GitRepository, 0)
	orderStr := "last_activity_at"
	simple := true
	searchNamespaces := true
	minAccessLevel := gitlab.GuestPermissions
	options := &gitlab.ListProjectsOptions{
		Search:           &group,
		OrderBy:          &orderStr,
		Simple:           &simple,
		SearchNamespaces: &searchNamespaces,
		MinAccessLevel:   &minAccessLevel,
	}
	options.PerPage = 100

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()

	projects, response, err := c.client.Projects.ListProjects(options, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return nil, expErr
		}
		if tokenIsRevoked(err) {
			return nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		return nil, err
	}

	for _, prj := range projects {
		//if project name\path contains search and project namespace name\path contains group
		if (strings.Contains(strings.ToLower(prj.Path), strings.ToLower(search)) ||
			strings.Contains(strings.ToLower(prj.Name), strings.ToLower(search))) &&
			(strings.Contains(strings.ToLower(prj.Namespace.FullPath), strings.ToLower(group)) ||
				strings.Contains(strings.ToLower(prj.Namespace.Name), strings.ToLower(group))) {
			result = append(result, view.GitRepository{RepositoryId: strconv.Itoa(prj.ID), Name: prj.PathWithNamespace, DefaultBranch: prj.DefaultBranch})
			if len(result) >= limit {
				break
			}
		}
	}
	return result, nil
}

func (c gitlabClientImpl) getGroups(ctx context.Context, search string, limit int) ([]view.GitGroup, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]view.GitGroup, 0)
	allAvailable := true
	groupOptions := &gitlab.ListGroupsOptions{
		Search:       &search,
		AllAvailable: &allAvailable,
	}
	groupOptions.ListOptions = gitlab.ListOptions{PerPage: limit}
	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	groups, response, err := c.client.Groups.ListGroups(groupOptions, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return nil, expErr
		}
		if tokenIsRevoked(err) {
			return nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		return nil, err
	}
	for _, grp := range groups {
		result = append(result, view.GitGroup{Name: grp.FullPath})
		if len(result) >= limit {
			break
		}
	}
	return result, nil
}

func (c gitlabClientImpl) getNamespaces(ctx context.Context, search string, limit int) ([]view.GitGroup, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]view.GitGroup, 0)
	namespaceOptions := &gitlab.ListNamespacesOptions{
		Search: &search,
	}
	namespaceOptions.ListOptions = gitlab.ListOptions{PerPage: limit}
	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	namespaces, response, err := c.client.Namespaces.ListNamespaces(namespaceOptions, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return nil, expErr
		}
		if tokenIsRevoked(err) {
			return nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		return nil, err
	}
	for _, ns := range namespaces {
		result = append(result, view.GitGroup{Name: ns.FullPath})
		if len(result) >= limit {
			break
		}
	}
	return result, nil
}

func (c gitlabClientImpl) GetFileContent(ctx context.Context, projectId string, ref string, filePath string) ([]byte, string, string, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, "", "", err
	}

	if projectId == "" {
		return nil, "", "", fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if filePath == "" {
		return nil, "", "", fmt.Errorf("parameter %s can't be blank", "filePath")
	}

	var mdOptions gitlab.GetFileMetaDataOptions
	if ref != "" {
		mdOptions.Ref = &ref // Ref is the name of branch, tag or commit
	}
	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	ctx = actx.CreateContextWithStacktrace(ctx, fmt.Sprintf("GetFileContent(%s,%s,%s))", projectId, ref, filePath))
	trackGitlabCall(ctx)
	defer cancel()
	metadata, response, err := c.client.RepositoryFiles.GetFileMetaData(projectId, filePath, &mdOptions, gitlab.WithContext(ctx))
	if response != nil && response.StatusCode == http.StatusNotFound {
		return nil, "", "", nil
	}
	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, "", "", GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return nil, "", "", expErr
		}
		if tokenIsRevoked(err) {
			return nil, "", "", c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, "", "", GitlabDeadlineExceeded(err)
		}
		return nil, "", "", err
	}

	var options gitlab.GetRawFileOptions
	if ref != "" {
		options.Ref = &ref // Ref is the name of branch, tag or commit
	}
	ctx, cancel = context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	content, response, err := c.client.RepositoryFiles.GetRawFile(projectId, filePath, &options, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, "", "", GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return nil, "", "", expErr
		}
		if tokenIsRevoked(err) {
			return nil, "", "", c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, "", "", GitlabDeadlineExceeded(err)
		}
		return nil, "", "", err
	}

	contentType := response.Header.Get("Content-Type")

	return content, contentType, metadata.BlobID, nil
}

func (c gitlabClientImpl) GetFileContentByBlobId(ctx context.Context, projectId string, blobId string) ([]byte, string, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, "", err
	}

	if projectId == "" {
		return nil, "", fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if blobId == "" {
		return nil, "", fmt.Errorf("parameter %s can't be blank", "blobId")
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	ctx = actx.CreateContextWithStacktrace(ctx, fmt.Sprintf("GetFileContentByBlobId(%s,%s))", projectId, blobId))
	trackGitlabCall(ctx)
	defer cancel()
	fileData, response, err := c.client.Repositories.RawBlobContent(projectId, blobId, gitlab.WithContext(ctx))
	if response != nil && response.StatusCode == http.StatusNotFound {
		return nil, "", nil
	}
	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, "", GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return nil, "", expErr
		}
		if tokenIsRevoked(err) {
			return nil, "", c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, "", GitlabDeadlineExceeded(err)
		}
		return nil, "", err
	}
	contentType := response.Header.Get("Content-Type")

	return fileData, contentType, nil
}

func (c gitlabClientImpl) FileExists(ctx context.Context, projectId string, branchName string, filePath string) (bool, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return false, err
	}

	var options gitlab.GetFileMetaDataOptions
	if branchName != "" {
		options.Ref = &branchName
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	ctx = actx.CreateContextWithStacktrace(ctx, fmt.Sprintf("FileExists(%s,%s,%s))", projectId, branchName, filePath))
	trackGitlabCall(ctx)
	defer cancel()
	_, response, err := c.client.RepositoryFiles.GetFileMetaData(projectId, filePath, &options, gitlab.WithContext(ctx))
	if response != nil && response.StatusCode == http.StatusNotFound {
		return false, nil
	}
	if err != nil {
		if contextDeadlineExceeded(err) {
			return false, GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return false, expErr
		}
		if tokenIsRevoked(err) {
			return false, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return false, GitlabDeadlineExceeded(err)
		}
		return false, err
	}

	if response != nil && response.StatusCode == http.StatusOK {
		return true, nil
	}

	return false, nil
}

func (c gitlabClientImpl) ListDirectory(ctx context.Context, projectId string, branchName string, path string, pagingParams view.PagingParams,
	existingFiles map[string]bool, existingFolders []string) ([]view.FileNode, error) {

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, err
	}

	if projectId == "" {
		return nil, fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	var options gitlab.ListTreeOptions
	if branchName != "" {
		options.Ref = &branchName
	}
	path = strings.TrimPrefix(path, "/")
	if path != "" {
		options.Path = &path
	}

	itemsLeft := pagingParams.ItemsPerPage
	viewNodes := make([]view.FileNode, 0)
	startOffset := pagingParams.ItemsPerPage * (pagingParams.Page - 1)
	offset := 0

	options.ListOptions = gitlab.ListOptions{Page: pagingParams.Page, PerPage: pagingParams.ItemsPerPage}

	for itemsLeft > 0 {
		ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
		defer cancel()
		nodes, response, err := c.client.Repositories.ListTree(projectId, &options, gitlab.WithContext(ctx))
		if err != nil {
			if contextDeadlineExceeded(err) {
				return nil, GitlabDeadlineExceeded(err)
			}
			expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
			if expErr != nil {
				return nil, expErr
			}
			if tokenIsRevoked(err) {
				return nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
			}
			if deadlineExceeded(err) {
				return nil, GitlabDeadlineExceeded(err)
			}
			if branchNotFound(err) {
				return nil, GitlabBranchNotFound(projectId, branchName)
			}
			return nil, err
		}
		if (response.TotalItems - startOffset - offset) < itemsLeft {
			itemsLeft = 0
		}
		for _, node := range nodes {
			offset++
			fileId := node.Path

			if node.Type == "tree" {
				exists := false
				for _, existingFolder := range existingFolders {
					if strings.HasPrefix(fileId, existingFolder) ||
						fileId == strings.TrimSuffix(existingFolder, "/") {
						exists = true
						break
					}
				}
				if exists {
					continue
				}
			}
			_, exists := existingFiles[fileId]
			if exists {
				continue
			}

			viewNodes = append(viewNodes, *toViewNode(node))
			itemsLeft--
		}
		options.ListOptions.Page = options.ListOptions.Page + 1

	}

	return viewNodes, nil
}

func (c gitlabClientImpl) ListDirectoryFilesRecursive(ctx context.Context, projectId string, branchName string, path string) ([]string, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, err
	}

	if projectId == "" {
		return nil, fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	var options gitlab.ListTreeOptions
	if branchName != "" {
		options.Ref = &branchName
	}
	path = strings.TrimPrefix(path, "/")
	if path != "" {
		options.Path = &path
	}
	truePtr := true
	options.Recursive = &truePtr

	files := make([]string, 0)

	options.ListOptions = gitlab.ListOptions{Page: 1, PerPage: 100}
	for options.ListOptions.Page != 0 {
		ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
		defer cancel()
		nodes, response, err := c.client.Repositories.ListTree(projectId, &options, gitlab.WithContext(ctx))
		if err != nil { //todo check that 404 returns an error
			if contextDeadlineExceeded(err) {
				return nil, GitlabDeadlineExceeded(err)
			}
			expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
			if expErr != nil {
				return nil, expErr
			}
			if tokenIsRevoked(err) {
				return nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
			}
			if deadlineExceeded(err) {
				return nil, GitlabDeadlineExceeded(err)
			}
			if branchNotFound(err) {
				return nil, GitlabBranchNotFound(projectId, branchName)
			}
			return nil, err
		}
		for _, node := range nodes {
			if node.Type == "tree" {
				continue
			}
			fileId := node.Path
			files = append(files, fileId)
		}
		options.ListOptions.Page = response.NextPage
	}
	return files, nil
}

func (c gitlabClientImpl) GetRepoBranches(ctx context.Context, projectId string, search string, limit int) ([]string, []bool, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, nil, err
	}

	if projectId == "" {
		return nil, nil, fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	var names []string
	var canPush []bool

	var opts gitlab.ListBranchesOptions
	if search != "" {
		opts = gitlab.ListBranchesOptions{Search: &search}
	}

	var maxPageCount int
	if limit == -1 || limit == 100 {
		opts.PerPage = 100
		maxPageCount = -1
	} else if limit > 100 {
		opts.PerPage = 100
		maxPageCount = limit / 100
	} else {
		opts.PerPage = limit
		maxPageCount = 1
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	branches, response, err := c.client.Branches.ListBranches(projectId, &opts, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, nil, GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return nil, nil, expErr
		}
		if tokenIsRevoked(err) {
			return nil, nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, nil, GitlabDeadlineExceeded(err)
		}
		if response != nil && response.StatusCode == http.StatusNotFound {
			return nil, nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.RepositoryIdNotFound,
				Message: exception.RepositoryIdNotFoundMsg,
				Params:  map[string]interface{}{"repositoryId": projectId},
				Debug:   err.Error(),
			}
		}
		return nil, nil, err
	}
	if branches == nil || len(branches) == 0 {
		log.Debugf("No branches found for project with id %v! search='%s'", projectId, search)
		return nil, nil, nil
	}
	if response.TotalPages > 1 && maxPageCount != 1 {
		if maxPageCount == -1 {
			maxPageCount = response.TotalPages
		}
		for i := 2; i < maxPageCount; i++ {
			opts.Page = i
			ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
			defer cancel()
			branchesFromPage, listResponse, err := c.client.Branches.ListBranches(projectId, &opts, gitlab.WithContext(ctx))
			if err != nil {
				if contextDeadlineExceeded(err) {
					return nil, nil, GitlabDeadlineExceeded(err)
				}
				expErr := c.tokenUnexpectedlyExpired(listResponse.StatusCode, err)
				if expErr != nil {
					return nil, nil, expErr
				}
				if tokenIsRevoked(err) {
					return nil, nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
				}
				if deadlineExceeded(err) {
					return nil, nil, GitlabDeadlineExceeded(err)
				}
				return nil, nil, err
			}
			branches = append(branches, branchesFromPage...)
		}
	}
	for _, branch := range branches {
		names = append(names, branch.Name)
		canPush = append(canPush, branch.CanPush)
	}

	return names, canPush, nil
}

func (c gitlabClientImpl) BranchExists(ctx context.Context, projectId string, branchName string) (bool, bool, error) {
	if projectId == "" {
		return false, false, fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if branchName == "" {
		return false, false, fmt.Errorf("parameter %s can't be blank", "branchName")
	}
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return false, false, err
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	branch, response, err := c.client.Branches.GetBranch(projectId, branchName, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return false, false, GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return false, false, expErr
		}
		if response != nil && response.StatusCode == http.StatusNotFound {
			return false, false, nil
		}
		if tokenIsRevoked(err) {
			return false, false, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return false, false, GitlabDeadlineExceeded(err)
		}
		return false, false, err
	}
	if branch == nil || response.StatusCode != http.StatusOK {
		return false, false, err
	}
	return true, branch.CanPush, nil
}

func (c gitlabClientImpl) GetRepoNameAndUrl(ctx context.Context, gitRepoId string) (string, string, error) {
	if gitRepoId == "" {
		return "", "", fmt.Errorf("parameter %s can't be blank", "gitRepoId")
	}
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return "", "", err
	}
	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	project, response, err := c.client.Projects.GetProject(gitRepoId, &gitlab.GetProjectOptions{}, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return "", "", GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return "", "", expErr
		}
		if tokenIsRevoked(err) {
			return "", "", c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return "", "", GitlabDeadlineExceeded(err)
		}
		return "", "", err
	}
	if response != nil && response.StatusCode == http.StatusNotFound {
		return "", "", fmt.Errorf("requested git repository with id '%s' not found", gitRepoId)
	}
	return project.PathWithNamespace, project.HTTPURLToRepo, nil
}

func (c gitlabClientImpl) GetCommitsList(ctx context.Context, projectId string, branchName string, path string) ([]view.GitCommit, error) {
	if projectId == "" {
		return nil, fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if branchName == "" {
		return nil, fmt.Errorf("parameter %s can't be blank", "branchName")
	}
	if path == "" {
		return nil, fmt.Errorf("parameter %s can't be blank", "path")
	}

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	commits, response, err := c.client.Commits.ListCommits(projectId, &gitlab.ListCommitsOptions{
		RefName: &branchName,
		Path:    &path}, gitlab.WithContext(ctx))

	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return nil, expErr
		}
		if tokenIsRevoked(err) {
			return nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		return nil, fmt.Errorf("failed to get commits list %v", err)
	}

	if response.TotalPages > 1 {
		for i := 2; i <= response.TotalPages; i++ {
			ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
			defer cancel()
			commitsFromPage, listResponse, err := c.client.Commits.ListCommits(projectId, &gitlab.ListCommitsOptions{
				ListOptions: gitlab.ListOptions{Page: i},
				RefName:     &branchName,
				Path:        &path}, gitlab.WithContext(ctx))
			if err != nil {
				if contextDeadlineExceeded(err) {
					return nil, GitlabDeadlineExceeded(err)
				}
				expErr := c.tokenUnexpectedlyExpired(listResponse.StatusCode, err)
				if expErr != nil {
					return nil, expErr
				}
				if tokenIsRevoked(err) {
					return nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
				}
				if deadlineExceeded(err) {
					return nil, GitlabDeadlineExceeded(err)
				}
				return nil, err
			}
			commits = append(commits, commitsFromPage...)
		}
	}

	gitCommits := []view.GitCommit{}
	for _, commit := range commits {
		gitCommits = append(gitCommits,
			view.GitCommit{Id: commit.ID,
				CommitterName:  commit.CommitterName,
				CommitterEmail: commit.CommitterEmail,
				CommittedDate:  *commit.CommittedDate,
				Message:        commit.Message})
	}
	return gitCommits, nil
}

func (c gitlabClientImpl) GetFileBlobId(ctx context.Context, projectId string, branchName string, path string) (string, error) {
	if projectId == "" {
		return "", fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if path == "" {
		return "", fmt.Errorf("parameter %s can't be blank", "filePath")
	}

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return "", err
	}

	var mdOptions gitlab.GetFileMetaDataOptions
	if branchName != "" {
		mdOptions.Ref = &branchName
	}
	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	ctx = actx.CreateContextWithStacktrace(ctx, fmt.Sprintf("GetFileBlobId(%s,%s,%s))", projectId, branchName, path))
	trackGitlabCall(ctx)
	defer cancel()
	metadata, response, err := c.client.RepositoryFiles.GetFileMetaData(projectId, path, &mdOptions, gitlab.WithContext(ctx))
	if response != nil && response.StatusCode == http.StatusNotFound {
		return "", nil
	}
	if err != nil {
		if contextDeadlineExceeded(err) {
			return "", GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return "", expErr
		}
		if tokenIsRevoked(err) {
			return "", c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return "", GitlabDeadlineExceeded(err)
		}
		return "", err
	}

	return metadata.BlobID, nil
}

func (c gitlabClientImpl) GetBranchLastCommitId(ctx context.Context, projectId string, branchName string) (string, error) {
	if projectId == "" {
		return "", fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if branchName == "" {
		return "", fmt.Errorf("parameter %s can't be blank", "branchName")
	}

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	branch, response, err := c.client.Branches.GetBranch(projectId, branchName, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return "", GitlabDeadlineExceeded(err)
		}
		if response != nil && response.StatusCode == http.StatusNotFound {
			return "", nil
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return "", expErr
		}
		if tokenIsRevoked(err) {
			return "", c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		return "", err
	}
	if branch == nil || response.StatusCode != http.StatusOK || branch.Commit == nil {
		return "", err
	}

	return branch.Commit.ID, nil
}

func (c gitlabClientImpl) CommitChanges(ctx context.Context, projectId string, branchName string, newBranchName string, message string, actions []Action) error {
	if projectId == "" {
		return fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if branchName == "" {
		return fmt.Errorf("parameter %s can't be blank", "branchName")
	}
	if message == "" {
		return fmt.Errorf("parameter %s can't be blank", "message")
	}
	if len(actions) == 0 {
		return fmt.Errorf("parameter %s can't be blank", "actions")
	}

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return err
	}

	gitlabActions := toGitlabActions(actions)

	opt := gitlab.CreateCommitOptions{
		StartBranch:   &branchName,
		Branch:        &newBranchName,
		CommitMessage: &message,
		Actions:       gitlabActions,
	}
	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	_, response, err := c.client.Commits.CreateCommit(projectId, &opt, gitlab.WithContext(ctx))
	if response != nil && response.StatusCode == http.StatusForbidden {
		return &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientRightsToCommit,
			Message: exception.InsufficientRightsToCommitMsg,
			Params:  map[string]interface{}{"branch": branchName},
			Debug:   err.Error(),
		}
	}
	if err != nil {
		if contextDeadlineExceeded(err) {
			return GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return expErr
		}
		if tokenIsRevoked(err) {
			return c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return GitlabDeadlineExceeded(err)
		}
		if strings.Contains(err.Error(), "no tickets in message") {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.NoTicketInCommit,
				Message: exception.NoTicketInCommitMsg,
				Debug:   err.Error(),
			}
		}

		return fmt.Errorf("failed to commit changes %+v", err.Error())
	}
	return nil
}

func (c gitlabClientImpl) CloneBranch(ctx context.Context, projectId string, branchName string, newBranchName string) error {
	if projectId == "" {
		return fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if branchName == "" {
		return fmt.Errorf("parameter %s can't be blank", "branchName")
	}
	if newBranchName == "" {
		return fmt.Errorf("parameter %s can't be blank", "newBranchName")
	}

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return err
	}

	opt := gitlab.CreateBranchOptions{
		Branch: &newBranchName,
		Ref:    &branchName,
	}
	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	_, response, err := c.client.Branches.CreateBranch(projectId, &opt, gitlab.WithContext(ctx))
	if response != nil && response.StatusCode == http.StatusForbidden {
		return fmt.Errorf("failed to clone branch, not enough rights")
	}
	if err != nil {
		if contextDeadlineExceeded(err) {
			return GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return expErr
		}
		if tokenIsRevoked(err) {
			return c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return GitlabDeadlineExceeded(err)
		}
		return fmt.Errorf("failed to clone branch %+v", err.Error())
	}
	return nil
}

func (c gitlabClientImpl) CreateMergeRequest(ctx context.Context, projectId string, sourceBranchName string, targetBranchName string, title string, description string) (string, error) {
	if projectId == "" {
		return "", fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if sourceBranchName == "" {
		return "", fmt.Errorf("parameter %s can't be blank", "sourceBranchName")
	}
	if targetBranchName == "" {
		return "", fmt.Errorf("parameter %s can't be blank", "targetBranchName")
	}
	if title == "" {
		return "", fmt.Errorf("parameter %s can't be blank", "title")
	}

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return "", err
	}

	removeSourceBranch := true
	opt := gitlab.CreateMergeRequestOptions{
		Title:              &title,
		Description:        &description,
		TargetBranch:       &targetBranchName,
		SourceBranch:       &sourceBranchName,
		RemoveSourceBranch: &removeSourceBranch,
	}
	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	mergeRequest, response, err := c.client.MergeRequests.CreateMergeRequest(projectId, &opt, gitlab.WithContext(ctx))
	if response.StatusCode == http.StatusForbidden {
		return "", fmt.Errorf("failed to create merge request for project %v, not enough rights", projectId)
	}
	if err != nil {
		if contextDeadlineExceeded(err) {
			return "", GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return "", expErr
		}
		if tokenIsRevoked(err) {
			return "", c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return "", GitlabDeadlineExceeded(err)
		}
		return "", fmt.Errorf("failed to merge request branch %+v", err.Error())
	}
	return mergeRequest.WebURL, nil
}

func (c gitlabClientImpl) DeleteBranch(ctx context.Context, projectId string, branchName string) error {
	if projectId == "" {
		return fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if branchName == "" {
		return fmt.Errorf("parameter %s can't be blank", "branchName")
	}

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	response, err := c.client.Branches.DeleteBranch(projectId, branchName, gitlab.WithContext(ctx))
	if response != nil && response.StatusCode == http.StatusForbidden {
		return fmt.Errorf("failed to delete branch, not enough rights")
	}
	if err != nil {
		if contextDeadlineExceeded(err) {
			return GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return expErr
		}
		if tokenIsRevoked(err) {
			return c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return GitlabDeadlineExceeded(err)
		}
		return fmt.Errorf("failed to delete branch %+v", err.Error())
	}
	return nil
}

func (c gitlabClientImpl) GetRepoTags(ctx context.Context, projectId string, search string, limit int) ([]string, error) {
	if projectId == "" {
		return nil, fmt.Errorf("parameter %s can't be blank", "projectId")
	}

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, err
	}

	var names []string

	var orderBy, sort = "name", "asc"
	var opts gitlab.ListTagsOptions
	if search != "" {
		opts = gitlab.ListTagsOptions{Search: &search}
	}
	opts.OrderBy = &orderBy
	opts.Sort = &sort

	var maxPageCount int
	if limit == -1 || limit == 100 {
		opts.PerPage = 100
		maxPageCount = -1
	} else if limit > 100 {
		opts.PerPage = 100
		maxPageCount = limit / 100
	} else {
		opts.PerPage = limit
		maxPageCount = 1
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	tags, response, err := c.client.Tags.ListTags(projectId, &opts, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return nil, expErr
		}
		if tokenIsRevoked(err) {
			return nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		if response != nil && response.StatusCode == http.StatusNotFound {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Code:    exception.RepositoryIdNotFound,
				Message: exception.RepositoryIdNotFoundMsg,
				Params:  map[string]interface{}{"repositoryId": projectId},
				Debug:   err.Error(),
			}
		}
		return nil, err
	}
	if tags == nil || len(tags) == 0 {
		log.Debugf("No tags found for project with id %v! search='%s'", projectId, search)
		return nil, nil
	}
	if response.TotalPages > 1 && maxPageCount != 1 {
		if maxPageCount == -1 {
			maxPageCount = response.TotalPages
		}
		for i := 1; i < maxPageCount; i++ {
			opts.Page = i
			ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
			defer cancel()
			branchesFromPage, listResponse, err := c.client.Tags.ListTags(projectId, &opts, gitlab.WithContext(ctx))
			if err != nil {
				if contextDeadlineExceeded(err) {
					return nil, GitlabDeadlineExceeded(err)
				}
				expErr := c.tokenUnexpectedlyExpired(listResponse.StatusCode, err)
				if expErr != nil {
					return nil, expErr
				}
				if tokenIsRevoked(err) {
					return nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
				}
				if deadlineExceeded(err) {
					return nil, GitlabDeadlineExceeded(err)
				}
				return nil, err
			}
			tags = append(tags, branchesFromPage...)
		}
	}
	for _, tag := range tags {
		names = append(names, tag.Name)
	}

	return names, nil
}

func (c gitlabClientImpl) TagExists(ctx context.Context, id string, tag string) (bool, error) {
	if id == "" {
		return false, fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if tag == "" {
		return false, fmt.Errorf("parameter %s can't be blank", "tag")
	}

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return false, err
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	branch, response, err := c.client.Tags.GetTag(id, tag, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return false, GitlabDeadlineExceeded(err)
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return false, expErr
		}
		if response != nil && response.StatusCode == http.StatusNotFound {
			return false, nil
		}
		if tokenIsRevoked(err) {
			return false, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return false, GitlabDeadlineExceeded(err)
		}
		return false, err
	}
	if branch == nil || response.StatusCode != http.StatusOK {
		return false, err
	}
	return true, nil
}

func (c gitlabClientImpl) GetTagLastCommitId(ctx context.Context, projectId string, tagName string) (string, error) {
	if projectId == "" {
		return "", fmt.Errorf("parameter %s can't be blank", "projectId")
	}
	if tagName == "" {
		return "", fmt.Errorf("parameter %s can't be blank", "tagName")
	}

	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	tag, response, err := c.client.Tags.GetTag(projectId, tagName, gitlab.WithContext(ctx))
	if err != nil {
		if contextDeadlineExceeded(err) {
			return "", GitlabDeadlineExceeded(err)
		}
		if response != nil && response.StatusCode == http.StatusNotFound {
			return "", nil
		}
		expErr := c.tokenUnexpectedlyExpired(response.StatusCode, err)
		if expErr != nil {
			return "", expErr
		}
		if tokenIsRevoked(err) {
			return "", c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		return "", err
	}
	if tag == nil || response.StatusCode != http.StatusOK || tag.Commit == nil {
		return "", err
	}

	return tag.Commit.ID, nil
}

func (c gitlabClientImpl) GetBranchOrTagLastCommitId(ctx context.Context, projectId string, branchName string) (string, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return "", err
	}

	lastCommit, err := c.GetBranchLastCommitId(ctx, projectId, branchName)
	if err != nil {
		return "", err
	}
	if lastCommit == "" {
		return c.GetTagLastCommitId(ctx, projectId, branchName)
	}
	return lastCommit, nil
}

func (c gitlabClientImpl) BranchOrTagExists(ctx context.Context, id string, branchName string) (bool, bool, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return false, false, err
	}

	exists, canPush, err := c.BranchExists(ctx, id, branchName)
	if err != nil {
		return false, false, err
	}
	if !exists {
		exists, err = c.TagExists(ctx, id, branchName)
		return exists, false, err
	}
	return exists, canPush, nil
}

func (c gitlabClientImpl) GetCurrentUserInfo(ctx context.Context, login string) (*view.User, error) {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, DefaultContextTimeout)
	defer cancel()
	usr, _, err := c.client.Users.CurrentUser(gitlab.WithContext(ctx))

	if err != nil {
		if contextDeadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		if tokenIsRevoked(err) {
			return nil, c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return nil, GitlabDeadlineExceeded(err)
		}
		return nil, err
	}

	if usr == nil {
		return nil, fmt.Errorf("current user is NULL")
	}

	return &view.User{Id: login, Name: usr.Name, AvatarUrl: usr.AvatarURL, Email: usr.Email}, nil
}

func (c gitlabClientImpl) WriteCommitArchive(ctx context.Context, projectId string, commitId string, writer io.Writer, format string) error {
	err := c.rateLimiter.Wait(ctx)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, time.Second*60)
	defer cancel()

	_, err = c.client.Repositories.StreamArchive(
		projectId,
		writer,
		&gitlab.ArchiveOptions{
			SHA:    &commitId,
			Format: &format,
		},
		gitlab.WithContext(ctx),
	)
	if err != nil {
		if contextDeadlineExceeded(err) {
			return GitlabDeadlineExceeded(err)
		}
		if tokenIsRevoked(err) {
			return c.tokenRevocationHandler.TokenRevoked(c.userId, view.GitlabIntegration)
		}
		if deadlineExceeded(err) {
			return GitlabDeadlineExceeded(err)
		}
		return err
	}

	return nil
}

type GitRepoCoordinates struct {
	host      string
	groupsStr string
	groups    []string
	name      string
}

func parseGitRepoUrl(url string) (*GitRepoCoordinates, error) {
	if !(strings.HasPrefix(url, "https://") && strings.HasSuffix(url, ".git")) {
		return nil, fmt.Errorf("incorrect https git repo URL provided. Expecting format https://git.domain.com/abc/def.git")
	}

	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimSuffix(url, ".git")

	parts := strings.Split(url, "/")
	if len(parts) < 2 {
		return nil, fmt.Errorf("incorrect https git repo URL provided. Cannot detect repo name")
	}

	result := GitRepoCoordinates{groups: []string{}}
	result.host = "https://" + parts[0]
	count := len(parts)
	for i := 1; i < count; i++ {
		if i == (count - 1) {
			result.name = parts[i]
			break
		}
		result.groups = append(result.groups, parts[i])
	}
	result.groupsStr = strings.Join(result.groups, "/")

	return &result, nil
}

func isGitRepoUrl(str string) bool {
	url, err := url.ParseRequestURI(str)
	if err != nil {
		return false
	}
	return strings.HasSuffix(url.Path, ".git")
}

func toViewNode(gitlabNode *gitlab.TreeNode) *view.FileNode {
	isFolder := false
	if gitlabNode.Type == "tree" {
		isFolder = true
	}

	return &view.FileNode{Name: gitlabNode.Name, IsFolder: isFolder}
}

var base64Encoding = "base64"

func toGitlabActions(actions []Action) []*gitlab.CommitActionOptions {
	result := []*gitlab.CommitActionOptions{}
	for _, action := range actions {
		tmpAction := action
		var gitlabAction *gitlab.FileActionValue
		switch action.Type {
		case ActionTypeCreate:
			gitlabAction = gitlab.FileAction(gitlab.FileCreate)
		case ActionTypeDelete:
			gitlabAction = gitlab.FileAction(gitlab.FileDelete)
		case ActionTypeMove:
			gitlabAction = gitlab.FileAction(gitlab.FileMove)
		case ActionTypeUpdate:
			gitlabAction = gitlab.FileAction(gitlab.FileUpdate)
		}

		if action.isBase64Encoded {
			result = append(result, &gitlab.CommitActionOptions{
				Action:       gitlabAction,
				FilePath:     &tmpAction.FilePath,
				PreviousPath: &tmpAction.PreviousPath,
				Content:      &tmpAction.Content,
				Encoding:     &base64Encoding,
			})
		} else {
			result = append(result, &gitlab.CommitActionOptions{
				Action:       gitlabAction,
				FilePath:     &tmpAction.FilePath,
				PreviousPath: &tmpAction.PreviousPath,
				Content:      &tmpAction.Content,
			})
		}

	}
	return result
}

func tokenExpired(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "Token is expired")
}

func tokenIsRevoked(err error) bool {
	if strings.Contains(err.Error(), "Token was revoked") {
		return true
	}
	return false
}

func contextDeadlineExceeded(err error) bool {
	return errors.Is(err, context.DeadlineExceeded)
}

func deadlineExceeded(err error) bool {
	return strings.Contains(err.Error(), "Deadline Exceeded")
}

func branchNotFound(err error) bool {
	return strings.Contains(err.Error(), "Tree Not Found")
}

func (c gitlabClientImpl) tokenUnexpectedlyExpired(responseCode int, err error) error {
	if responseCode == http.StatusUnauthorized && tokenExpired(err) {
		_, _, expError := c.tokenExpirationHandler.TokenExpired(c.userId, view.GitlabIntegration)
		if expError != nil {
			return fmt.Errorf("failed to refresh gitlab token: %v", expError)
		}
		return &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.IntegrationTokenUnexpectedlyExpired,
			Message: exception.IntegrationTokenUnexpectedlyExpiredMsg,
		}
	}
	return nil
}

func trackGitlabCall(ctx context.Context) {
	stacktrace := actx.GetStacktraceFromContext(ctx)
	if stacktrace == nil {
		return
	}
	// ok we have the stacktrace now
	log.Debugf("Gitlab call stacktrace: %+v", stacktrace) // initial impl
}
