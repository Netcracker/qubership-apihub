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
	"sort"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type IntegrationsService interface {
	GetUserApiKeyStatus(integration view.GitIntegrationType, userId string) (view.ApiKeyStatus, error)
	SetUserApiKey(integration view.GitIntegrationType, userId string, apiKey string) error
	DeleteUserApiKey(integration view.GitIntegrationType, userId string) error
	SetOauthGitlabTokenForUser(integration view.GitIntegrationType, userId string, oauthToken string, refreshToken string, expiresAt time.Time, redirectUri string) error
	ListRepositories(ctx context.SecurityContext, integration view.GitIntegrationType, search string) ([]view.GitRepository, []view.GitGroup, error)
	ListBranchesAndTags(ctx context.SecurityContext, integration view.GitIntegrationType, repoId string, filter string) (*view.GitBranches, error)
}

const ApiKeyStatusPresent = "API_KEY_PRESENT"
const ApiKeyStatusAbsent = "API_KEY_ABSENT"
const ApiKeyStatusRevoked = "API_KEY_REVOKED"

func NewIntegrationsService(repo repository.GitIntegrationRepository, gitClientProvider GitClientProvider) IntegrationsService {
	return &integrationsServiceImpl{repo: repo, gitClientProvider: gitClientProvider}
}

type integrationsServiceImpl struct {
	repo              repository.GitIntegrationRepository
	gitClientProvider GitClientProvider
}

func (s integrationsServiceImpl) ListRepositories(ctx context.SecurityContext, integration view.GitIntegrationType, search string) ([]view.GitRepository, []view.GitGroup, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("ListRepositories(%+v,%s)", integration, search))

	client, err := s.gitClientProvider.GetUserClient(integration, ctx.GetUserId())
	if err != nil {
		return nil, nil, err
	}
	return client.SearchRepositories(goCtx, search, 15)
}

func (s integrationsServiceImpl) ListBranchesAndTags(ctx context.SecurityContext, integration view.GitIntegrationType, repoId string, filter string) (*view.GitBranches, error) {
	goCtx := context.CreateContextWithSecurity(goctx.Background(), ctx) // TODO: should be context from the request
	goCtx = context.CreateContextWithStacktrace(goCtx, fmt.Sprintf("ListBranchesAndTags(%+v,%s,%s)", integration, repoId, filter))

	gitClient, err := s.gitClientProvider.GetUserClient(integration, ctx.GetUserId())
	if err != nil {
		return nil, err
	}
	branchNames, _, err := gitClient.GetRepoBranches(goCtx, repoId, filter, -1)
	if err != nil {
		return nil, err
	}
	branches := make([]view.GitBranch, 0)
	for _, name := range branchNames {
		branches = append(branches, view.GitBranch{Name: name})
	}
	tags, err := gitClient.GetRepoTags(goCtx, repoId, filter, -1)
	for _, name := range tags {
		branches = append(branches, view.GitBranch{Name: name})
	}
	sort.Slice(branches, func(i, j int) bool {
		return branches[i].Name < branches[j].Name
	})
	return &view.GitBranches{Branches: branches}, nil
}

func (s integrationsServiceImpl) SetOauthGitlabTokenForUser(integration view.GitIntegrationType, userId string, oauthToken string, refreshToken string, expiresAt time.Time, redirectUri string) error {
	conf, err := s.gitClientProvider.GetConfiguration(integration)
	if err != nil {
		return err
	}

	// probe test for new oauth token
	_, err = client.NewGitlabOauthClient(conf.BaseUrl, oauthToken, userId, &client.TokenRevocationHandlerStub{}, &client.TokenExpirationHandlerStub{})
	if err != nil {
		return fmt.Errorf("retrieved project access token is not functional. Error - %s", err.Error())
	}

	_, err = s.repo.SaveUserApiKey(entity.ApiKeyEntity{
		Integration:           integration,
		UserId:                userId,
		AccessToken:           oauthToken,
		RefreshToken:          refreshToken,
		ExpiresAt:             expiresAt,
		RedirectUri:           redirectUri,
		FailedRefreshAttempts: 0,
	})
	if err != nil {
		return err
	}
	return s.gitClientProvider.UpdateUserCache(integration, userId, expiresAt)
}

func (s integrationsServiceImpl) GetUserApiKeyStatus(integration view.GitIntegrationType, userId string) (view.ApiKeyStatus, error) {
	entity, err := s.repo.GetUserApiKey(integration, userId)
	if err != nil {
		return view.ApiKeyStatus{}, err
	}
	if entity != nil && entity.AccessToken != "" {
		if entity.IsRevoked {
			return view.ApiKeyStatus{Status: ApiKeyStatusRevoked}, nil
		}
		return view.ApiKeyStatus{Status: ApiKeyStatusPresent}, nil
	} else {
		return view.ApiKeyStatus{Status: ApiKeyStatusAbsent}, nil
	}
}

func (s integrationsServiceImpl) SetUserApiKey(integration view.GitIntegrationType, userId string, apiKey string) error {
	_, err := s.gitClientProvider.GetUserClientWithNewKey(integration, userId, apiKey)
	if err != nil {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.GitIntegrationConnectFailed,
			Message: exception.GitIntegrationConnectFailedMsg,
			Params:  map[string]interface{}{"type": integration, "user": userId},
			Debug:   err.Error(),
		}
	}
	_, err = s.repo.SaveUserApiKey(entity.ApiKeyEntity{Integration: integration, UserId: userId, AccessToken: apiKey})
	return err
}

func (s integrationsServiceImpl) DeleteUserApiKey(integration view.GitIntegrationType, userId string) error {
	return s.repo.DeleteUserApiKey(integration, userId)
}
