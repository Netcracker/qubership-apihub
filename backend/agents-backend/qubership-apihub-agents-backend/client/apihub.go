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
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	log "github.com/sirupsen/logrus"
	"gopkg.in/resty.v1"
)

type ApihubClient interface {
	CheckAuthToken(ctx context.Context, token string) (bool, error)
	GetApiKeyByKey(ctx context.Context, apiKey string) (*view.ApihubApiKeyView, error)
	GetPatByPAT(ctx context.Context, token string) (*view.PersonalAccessTokenExtAuthView, error)

	GetPackageById(ctx context.Context, id string) (*view.SimplePackage, error)
	GetPackageByServiceName(ctx context.Context, workspaceId string, serviceName string) (*view.PackagesInfo, error)
	CreatePackage(ctx context.Context, pkg view.PackageCreateRequest) (string, error)
	GetPackages(ctx context.Context, searchReq view.PackagesSearchReq) (*view.Packages, error)
	GetUserPackagesPromoteStatuses(ctx context.Context, packagesReq view.PackagesReq) (view.AvailablePackagePromoteStatuses, error)
	GetVersion(ctx context.Context, id, version string) (*view.VersionContent, error)
	Publish(ctx context.Context, config view.BuildConfig, src []byte, clientBuild bool, builderId string, saveSources bool, dependencies []string) (string, error)
	GetVersions(ctx context.Context, packageId string, searchReq view.VersionSearchRequest) (*view.PublishedVersionsView, error)
	DeleteVersionsRecursively(ctx context.Context, packageId string, req view.DeleteVersionsRecursivelyReq) (string, error)
	GetVersionReferences(ctx context.Context, id, version string) (*view.VersionReferences, error)
	GetVersionRestOperationsWithData(ctx context.Context, packageId string, version string, limit int, page int) (*view.RestOperations, error)
	GetPublishStatuses(ctx context.Context, packageId string, publishIds []string) ([]view.PublishStatusResponse, error)
	GetApiKeyById(ctx context.Context, apiKeyId string) (*view.ApihubApiKeyView, error)
	GetUserById(ctx context.Context, userId string) (*view.User, error)
	GetSystemInfo(ctx context.Context) (*view.ApihubSystemInfo, error)
}

func NewApihubClient(apihubUrl string, accessToken string) ApihubClient {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}
	client := resty.NewWithClient(&cl)
	return &apihubClientImpl{client: client, apihubUrl: apihubUrl, accessToken: accessToken}
}

type apihubClientImpl struct {
	client      *resty.Client
	apihubUrl   string
	accessToken string
}

func (a apihubClientImpl) CheckAuthToken(ctx context.Context, token string) (bool, error) {
	req := a.client.R()
	req.SetContext(ctx)
	req.SetHeader("Cookie", fmt.Sprintf("%s=%s", view.AccessTokenCookieName, token))

	resp, err := req.Get(fmt.Sprintf("%s/api/v1/auth/token", a.apihubUrl))
	if err != nil || resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (a apihubClientImpl) GetApiKeyByKey(ctx context.Context, apiKey string) (*view.ApihubApiKeyView, error) {
	req := a.client.R()
	req.SetContext(ctx)
	req.SetHeader("api-key", apiKey)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/auth/apiKey", a.apihubUrl))
	if err != nil || resp.StatusCode() != http.StatusOK {
		if resp != nil && resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		return nil, err
	}

	var apiKeyView view.ApihubApiKeyView
	err = json.Unmarshal(resp.Body(), &apiKeyView)
	if err != nil {
		return nil, err
	}

	return &apiKeyView, nil
}

func (a apihubClientImpl) GetPatByPAT(ctx context.Context, token string) (*view.PersonalAccessTokenExtAuthView, error) {
	req := a.client.R()
	req.SetContext(ctx)
	req.SetHeader("X-Personal-Access-Token", token)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/auth/pat", a.apihubUrl))
	if err != nil || resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, nil
		}
		return nil, err
	}

	var pat view.PersonalAccessTokenExtAuthView
	err = json.Unmarshal(resp.Body(), &pat)
	if err != nil {
		return nil, err
	}

	return &pat, nil
}

func (a apihubClientImpl) GetPackageById(ctx context.Context, id string) (*view.SimplePackage, error) {
	req := a.makeRequest(ctx)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages/%s", a.apihubUrl, url.PathEscape(id)))

	if err != nil {
		return nil, err
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get package by id -  %s : status code %d %v", id, resp.StatusCode(), err)
	}

	var pkg view.SimplePackage

	err = json.Unmarshal(resp.Body(), &pkg)
	if err != nil {
		return nil, err
	}
	return &pkg, nil
}

func (a apihubClientImpl) GetPackageByServiceName(ctx context.Context, workspaceId string, serviceName string) (*view.PackagesInfo, error) {
	req := a.makeRequest(ctx)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages?kind=package&serviceName=%s&parentId=%s&showAllDescendants=true", a.apihubUrl, url.PathEscape(serviceName), workspaceId))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get package id by service name -  %s : status code %d %v", serviceName, resp.StatusCode(), err)
	}

	var packages view.Packages

	err = json.Unmarshal(resp.Body(), &packages)
	if err != nil {
		return nil, err
	}

	if len(packages.Packages) == 0 {
		return nil, nil
	}

	if len(packages.Packages) != 1 {
		return nil, fmt.Errorf("unable to get package by id: unexpected number of packages returned %d", len(packages.Packages))
	}
	pkg := packages.Packages[0]
	return &pkg, nil
}

func (a apihubClientImpl) CreatePackage(ctx context.Context, pkg view.PackageCreateRequest) (string, error) {
	req := a.makeRequest(ctx)
	req.SetBody(pkg)

	resp, err := req.Post(fmt.Sprintf("%s/api/v2/packages", a.apihubUrl))
	if err != nil {
		return "", err
	}
	if resp.StatusCode() != http.StatusCreated {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return "", authErr
		}
		return "", fmt.Errorf("failed to create package by request -  %v : status code %d %v", pkg, resp.StatusCode(), err)
	}
	var res view.SimplePackage
	err = json.Unmarshal(resp.Body(), &res)
	if err != nil {
		return "", err
	}
	return res.Id, nil
}

func (a apihubClientImpl) GetPackages(ctx context.Context, searchReq view.PackagesSearchReq) (*view.Packages, error) {
	req := a.makeRequest(ctx)

	base, err := url.Parse(fmt.Sprintf("%s/api/v2/packages", a.apihubUrl))
	if err != nil {
		return nil, err
	}
	if searchReq.Limit == 0 {
		searchReq.Limit = 100
	}
	params := url.Values{}
	if searchReq.TextFilter != "" {
		params.Add("textFilter", searchReq.TextFilter)
	}
	if searchReq.ServiceName != "" {
		params.Add("serviceName", searchReq.ServiceName)
	}
	if searchReq.ParentId != "" {
		params.Add("parentId", searchReq.ParentId)
	}
	if searchReq.ShowAllDescendants {
		params.Add("showAllDescendants", strconv.FormatBool(searchReq.ShowAllDescendants))
	}
	if searchReq.ShowParents {
		params.Add("showParents", strconv.FormatBool(searchReq.ShowParents))
	}
	if searchReq.Kind != "" {
		params.Add("kind", searchReq.Kind)
	}
	base.RawQuery = params.Encode()

	var uri string
	if len(params) > 0 {
		uri = fmt.Sprintf("%s&limit=%d&page=%d", base.String(), searchReq.Limit, searchReq.Page)
	} else {
		uri = fmt.Sprintf("%s?limit=%d&page=%d", base.String(), searchReq.Limit, searchReq.Page)
	}
	resp, err := req.Get(uri)
	if err != nil {
		return nil, fmt.Errorf("failed to get package by serarchReq : %v. Response status code %d %v", searchReq, resp.StatusCode(), err)
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get packages by request -  %v : status code %d %v", searchReq, resp.StatusCode(), err)
	}

	var packages view.Packages

	err = json.Unmarshal(resp.Body(), &packages)
	if err != nil {
		return nil, err
	}
	if len(packages.Packages) == 0 {
		return nil, nil
	}
	return &packages, nil
}

func (a apihubClientImpl) GetUserPackagesPromoteStatuses(ctx context.Context, packagesReq view.PackagesReq) (view.AvailablePackagePromoteStatuses, error) {
	req := a.makeRequest(ctx)
	req.SetBody(packagesReq)

	resp, err := req.Post(fmt.Sprintf("%s/api/v2/users/%s/availablePackagePromoteStatuses", a.apihubUrl, url.QueryEscape(secctx.GetUserId(ctx))))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get user packages promote statuses by request -  %v : status code %d %v", packagesReq, resp.StatusCode(), err)
	}

	var result view.AvailablePackagePromoteStatuses
	err = json.Unmarshal(resp.Body(), &result)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (a apihubClientImpl) GetVersion(ctx context.Context, id, version string) (*view.VersionContent, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v3/packages/%s/versions/%s?includeSummary=true&includeOperations=true", a.apihubUrl, url.PathEscape(id), url.PathEscape(version)))
	if err != nil {
		return nil, fmt.Errorf("failed to get version %s for id %s: %s", version, id, err.Error())
	}

	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get version %s for id %s: status code %d %v", version, id, resp.StatusCode(), err)
	}
	var versionContent view.VersionContent
	err = json.Unmarshal(resp.Body(), &versionContent)
	if err != nil {
		return nil, err
	}
	for _, operationType := range versionContent.OperationTypes {
		versionContent.ApiTypes = append(versionContent.ApiTypes, operationType.ApiType)
		if operationType.ChangesSummary != nil {
			changeSummary := *operationType.ChangesSummary
			if versionContent.ChangeSummary == nil {
				versionContent.ChangeSummary = &changeSummary
			} else {
				versionContent.ChangeSummary.Breaking += changeSummary.Breaking
				versionContent.ChangeSummary.SemiBreaking += changeSummary.SemiBreaking
				versionContent.ChangeSummary.Deprecated += changeSummary.Deprecated
				versionContent.ChangeSummary.NonBreaking += changeSummary.NonBreaking
				versionContent.ChangeSummary.Annotation += changeSummary.Annotation
				versionContent.ChangeSummary.Unclassified += changeSummary.Unclassified
			}
		}
	}
	return &versionContent, nil
}

func (a apihubClientImpl) Publish(ctx context.Context, config view.BuildConfig, src []byte, clientBuild bool, builderId string, saveSources bool, dependencies []string) (string, error) {
	req := a.makeRequest(ctx)

	confBytes, err := json.Marshal(config)
	if err != nil {
		return "", err
	}

	depBytes, err := json.Marshal(dependencies)
	if err != nil {
		return "", err
	}

	var data []*resty.MultipartField
	data = append(data, &resty.MultipartField{
		Param:  "config",
		Reader: bytes.NewReader(confBytes),
	})
	data = append(data, &resty.MultipartField{
		Param:  "clientBuild",
		Reader: strings.NewReader(strconv.FormatBool(clientBuild)),
	})
	data = append(data, &resty.MultipartField{
		Param:  "saveSources",
		Reader: strings.NewReader(strconv.FormatBool(saveSources)),
	})
	data = append(data, &resty.MultipartField{
		Param:  "dependencies",
		Reader: bytes.NewReader(depBytes),
	})
	if builderId != "" {
		data = append(data, &resty.MultipartField{
			Param:  "builderId",
			Reader: strings.NewReader(builderId),
		})
	}

	if src != nil {
		req.SetFileReader("sources", "sources.zip", bytes.NewReader(src))
	}

	req.SetMultipartFields(data...)

	resp, err := req.Post(fmt.Sprintf("%s/api/v2/packages/%s/publish", a.apihubUrl, url.PathEscape(config.PackageId)))
	if err != nil {
		return "", fmt.Errorf("failed to build and publish package %s: %s", config.PackageId, err.Error())
	}
	if !(resp.StatusCode() == http.StatusAccepted || resp.StatusCode() == http.StatusNoContent) {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return "", authErr
		}
		return "", fmt.Errorf("failed to build and publish package %s: status code = %d, body = %s", config.PackageId, resp.StatusCode(), string(resp.Body()))
	}
	var publishResponse view.PublishId
	if err = json.Unmarshal(resp.Body(), &publishResponse); err != nil {
		return "", err
	}
	return publishResponse.PublishId, nil
}

func (a apihubClientImpl) GetVersions(ctx context.Context, packageId string, searchReq view.VersionSearchRequest) (*view.PublishedVersionsView, error) {
	req := a.makeRequest(ctx)
	base, err := url.Parse(fmt.Sprintf("%s/api/v3/packages/%s/versions", a.apihubUrl, url.PathEscape(packageId)))
	if err != nil {
		return nil, err
	}

	if searchReq.Limit == 0 {
		searchReq.Limit = 100
	}
	params := url.Values{}
	if searchReq.Status != "" {
		params.Add("status", searchReq.Status)
	}
	if searchReq.VersionLabel != "" {
		params.Add("versionLabel", searchReq.VersionLabel)
	}
	if searchReq.TextFilter != "" {
		params.Add("textFilter", searchReq.TextFilter)
	}
	if searchReq.CheckRevisions {
		params.Add("checkRevisions", strconv.FormatBool(searchReq.CheckRevisions))
	}
	if searchReq.SortBy != "" {
		params.Add("sortBy", searchReq.SortBy)
	} else {
		params.Add("sortBy", view.VersionSortByCreatedAt)
	}
	if searchReq.SortOrder != "" {
		params.Add("sortOrder", searchReq.SortOrder)
	} else {
		params.Add("sortOrder", view.VersionSortOrderDesc)
	}
	base.RawQuery = params.Encode()
	var uri string
	if len(params) > 0 {
		uri = fmt.Sprintf("%s&limit=%d&page=%d", base.String(), searchReq.Limit, searchReq.Page)
	} else {
		uri = fmt.Sprintf("%s?limit=%d&page=%d", base.String(), searchReq.Limit, searchReq.Page)
	}
	resp, err := req.Get(uri)
	if err != nil {
		return nil, fmt.Errorf("failed to get versions for package with id %s. Error - %s", packageId, err.Error())
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get versions for package with id %s. Response status code %d %v", packageId, resp.StatusCode(), err)
	}
	var pVersions view.PublishedVersionsView
	err = json.Unmarshal(resp.Body(), &pVersions)
	if err != nil {
		return nil, err
	}
	return &pVersions, nil
}

func (a apihubClientImpl) DeleteVersionsRecursively(ctx context.Context, packageId string, parameters view.DeleteVersionsRecursivelyReq) (string, error) {
	req := a.makeRequest(ctx)

	req.SetBody(parameters)
	resp, err := req.Post(fmt.Sprintf("%s/api/v2/packages/%s/versions/recursiveDelete", a.apihubUrl, packageId))
	if err != nil {
		return "", err
	}
	if resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return "", authErr
		}
		if resp.StatusCode() == http.StatusNotFound {
			return "", nil
		}
		return "", fmt.Errorf("failed to send delete versions by retention request with error code %d", resp.StatusCode())
	}
	var response view.DeleteVersionsRecursiveResponse
	err = json.Unmarshal(resp.Body(), &response)
	if err != nil {
		return "", err
	}
	return response.JobId, nil
}

func (a apihubClientImpl) GetVersionReferences(ctx context.Context, id, version string) (*view.VersionReferences, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v3/packages/%s/versions/%s/references", a.apihubUrl, url.PathEscape(id), url.PathEscape(version)))
	if err != nil {
		return nil, fmt.Errorf("failed to get version %s for id %s: %s", version, id, err.Error())
	}

	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get version references. version - %s for id %s: status code %d %v", version, id, resp.StatusCode(), err)
	}
	var versionReferences view.VersionReferences
	err = json.Unmarshal(resp.Body(), &versionReferences)
	if err != nil {
		return nil, err
	}
	return &versionReferences, nil
}

func (a apihubClientImpl) GetVersionRestOperationsWithData(ctx context.Context, packageId string, version string, limit int, page int) (*view.RestOperations, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages/%s/versions/%s/rest/operations?includeData=true&limit=%d&page=%d", a.apihubUrl, url.PathEscape(packageId), url.PathEscape(version), limit, page))
	if err != nil {
		return nil, fmt.Errorf("failed to get version rest operations. Error - %s", err.Error())
	}

	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get version rest operations: status code %d %v", resp.StatusCode(), err)
	}

	var restOperations view.RestOperations
	err = json.Unmarshal(resp.Body(), &restOperations)
	if err != nil {
		return nil, err
	}
	return &restOperations, nil
}

func (a apihubClientImpl) GetPublishStatuses(ctx context.Context, packageId string, publishIds []string) ([]view.PublishStatusResponse, error) {
	req := a.makeRequest(ctx)
	req.SetBody(map[string]interface{}{
		"publishIds": publishIds,
	})
	resp, err := req.Post(fmt.Sprintf("%s/api/v2/packages/%s/publish/statuses", a.apihubUrl, packageId))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get build statuses for %v: status code %d %v", publishIds, resp.StatusCode(), err)
	}
	var res []view.PublishStatusResponse
	err = json.Unmarshal(resp.Body(), &res)
	if err != nil {
		return nil, err
	}
	return res, nil
}

func (a apihubClientImpl) GetApiKeyById(ctx context.Context, apiKeyId string) (*view.ApihubApiKeyView, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v1/auth/apiKey/%s", a.apihubUrl, apiKeyId))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get api-key info: status code %d %v", resp.StatusCode(), err)
	}
	var apiKey view.ApihubApiKeyView
	err = json.Unmarshal(resp.Body(), &apiKey)
	if err != nil {
		return nil, err
	}
	return &apiKey, nil
}

func (a apihubClientImpl) GetUserById(ctx context.Context, userId string) (*view.User, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/users/%s", a.apihubUrl, userId))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get user info: status code %d %v", resp.StatusCode(), err)
	}
	var user view.User
	err = json.Unmarshal(resp.Body(), &user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (a apihubClientImpl) GetSystemInfo(ctx context.Context) (*view.ApihubSystemInfo, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v1/system/info", a.apihubUrl))
	if err != nil {
		return nil, fmt.Errorf("failed to get APIHUB system info: %s", err.Error())
	}
	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("failed to get APIHUB system info: status code %d", resp.StatusCode())
	}
	var config view.ApihubSystemInfo
	err = json.Unmarshal(resp.Body(), &config)
	if err != nil {
		return nil, err
	}
	return &config, nil
}

func checkUnauthorized(resp *resty.Response) error {
	if resp != nil && (resp.StatusCode() == http.StatusUnauthorized || resp.StatusCode() == http.StatusForbidden) {
		log.Errorf("Incorrect api key detected!")
		return &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.NoApihubAccess,
			Message: exception.NoApihubAccessMsg,
			Params:  map[string]interface{}{"code": strconv.Itoa(resp.StatusCode())},
		}
	}
	return nil
}

func (a apihubClientImpl) makeRequest(ctx context.Context) *resty.Request {
	req := a.client.R()
	req.SetContext(ctx)

	if secctx.IsSystem(ctx) {
		req.SetHeader("api-key", a.accessToken)
	} else {
		if secctx.GetUserToken(ctx) != "" {
			req.SetHeader("Authorization", fmt.Sprintf("Bearer %s", secctx.GetUserToken(ctx)))
		} else if secctx.GetApiKey(ctx) != "" {
			req.SetHeader("api-key", secctx.GetApiKey(ctx))
		} else if secctx.GetPersonalAccessToken(ctx) != "" {
			req.SetHeader("X-Personal-Access-Token", secctx.GetPersonalAccessToken(ctx))
		}
	}
	return req
}
