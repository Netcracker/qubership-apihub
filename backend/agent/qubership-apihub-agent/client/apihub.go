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
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/secctx"
	"github.com/Netcracker/qubership-apihub-agent/view"
	"gopkg.in/resty.v1"
)

// //go:generate mockgen -destination ../mock_client/apihub.go github.com/Netcracker/qubership-apihub-agent/client ApihubClient

type ApihubClient interface {
	GetVersions(ctx secctx.SecurityContext, id string, page, limit int) (*view.PublishedVersionsView, error)

	GetPackageByServiceName(ctx secctx.SecurityContext, workspaceId string, serviceName string) (*view.SimplePackage, error)

	GetUserPackagesPromoteStatuses(ctx secctx.SecurityContext, packagesReq view.PackagesReq) (view.AvailablePackagePromoteStatuses, error)

	GetSystemConfiguration() (*view.ApihubSystemConfigurationInfo, error)

	GetRsaPublicKey(ctx secctx.SecurityContext) (*view.PublicKey, error)
	CheckApiKeyValid(apiKey string) (bool, error)
	CheckAuthToken(ctx context.Context, token string) (bool, error)
}

func NewApihubClient(apihubUrl string, accessToken string, cloudName string) ApihubClient {
	return &apihubClientImpl{apihubUrl: apihubUrl, accessToken: accessToken, cloudName: cloudName}
}

type apihubClientImpl struct {
	apihubUrl   string
	accessToken string
	cloudName   string
}

func checkUnauthorized(resp *resty.Response) error {
	if resp != nil && (resp.StatusCode() == http.StatusUnauthorized || resp.StatusCode() == http.StatusForbidden) {
		log.Errorf("Not sufficient rights or incorrect api key. Code = %d. Request = %s", resp.StatusCode(), resp.Request.URL)
		// TODO: need to improve the check. Detect incorrect api keys if suitable(check context) or user missing grants
		return &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.NoApihubAccess,
			Message: exception.NoApihubAccessMsg,
			Params:  map[string]interface{}{"code": strconv.Itoa(resp.StatusCode())},
		}
	}
	return nil
}

func (a apihubClientImpl) GetVersions(ctx secctx.SecurityContext, id string, page, limit int) (*view.PublishedVersionsView, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v3/packages/%s/versions?page=%d&limit=%d", a.apihubUrl, url.PathEscape(id), page, limit))
	if err != nil {
		return nil, fmt.Errorf("failed to get versions for %s: %s", id, err.Error())
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get versions for %s: status code %d", id, resp.StatusCode())
	}
	var versions view.PublishedVersionsView
	err = json.Unmarshal(resp.Body(), &versions)
	if err != nil {
		return nil, err
	}
	return &versions, nil
}

func (a apihubClientImpl) GetPackageByServiceName(ctx secctx.SecurityContext, workspaceId string, serviceName string) (*view.SimplePackage, error) {
	req := a.makeRequest(ctx)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages?kind=package&serviceName=%s&parentId=%s&showAllDescendants=true", a.apihubUrl, url.QueryEscape(serviceName), workspaceId))
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
		return nil, fmt.Errorf("failed to get package by service name - %s: status code %d", serviceName, resp.StatusCode())
	}
	var packages view.SimplePackages

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
	return &packages.Packages[0], nil
}
func (a apihubClientImpl) GetRsaPublicKey(ctx secctx.SecurityContext) (*view.PublicKey, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/auth/publicKey", a.apihubUrl))
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
		return nil, fmt.Errorf("failed to get rsa public key from apihub: status code %d", resp.StatusCode())
	}
	publicKey := view.PublicKey{
		Value: resp.Body(),
	}
	return &publicKey, nil
}

func (a apihubClientImpl) GetUserPackagesPromoteStatuses(ctx secctx.SecurityContext, packagesReq view.PackagesReq) (view.AvailablePackagePromoteStatuses, error) {
	req := a.makeRequest(ctx)
	req.SetBody(packagesReq)

	resp, err := req.Post(fmt.Sprintf("%s/api/v2/users/%s/availablePackagePromoteStatuses", a.apihubUrl, url.QueryEscape(ctx.GetUserId())))
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
		return nil, fmt.Errorf("failed to get user packages promote statuses by request %v: status code %d", packagesReq, resp.StatusCode())
	}
	var result view.AvailablePackagePromoteStatuses
	err = json.Unmarshal(resp.Body(), &result)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (a apihubClientImpl) CheckApiKeyValid(apiKey string) (bool, error) {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}

	client := resty.NewWithClient(&cl)
	req := client.R()

	req.SetHeader("api-key", apiKey)

	resp, err := req.Get(fmt.Sprintf("%s/api/v1/system/info", a.apihubUrl))
	if err != nil || resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (a apihubClientImpl) CheckAuthToken(ctx context.Context, token string) (bool, error) {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}

	client := resty.NewWithClient(&cl)
	req := client.R()
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

func (a apihubClientImpl) GetSystemConfiguration() (*view.ApihubSystemConfigurationInfo, error) {
	req := a.makeRequest(secctx.CreateSystemContext())
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/system/configuration", a.apihubUrl))
	if err != nil {
		return nil, fmt.Errorf("failed to get APIHUB system configuration: %s", err.Error())
	}
	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("failed to get APIHUB system configuration: status code %d", resp.StatusCode())
	}
	var config view.ApihubSystemConfigurationInfo
	err = json.Unmarshal(resp.Body(), &config)
	if err != nil {
		return nil, err
	}
	return &config, nil
}

func (a apihubClientImpl) makeRequest(ctx secctx.SecurityContext) *resty.Request {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}

	client := resty.NewWithClient(&cl)
	req := client.R()
	if ctx.GetUserToken() != "" {
		req.SetHeader("Authorization", fmt.Sprintf("Bearer %s", ctx.GetUserToken()))
	} else {
		req.SetHeader("api-key", a.accessToken)
	}
	return req
}
