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
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	"gopkg.in/resty.v1"
)

type AgentClient interface {
	GetNamespaces(ctx context.Context, agentUrl string) (*view.AgentNamespaces, error)
	ListServiceNames(ctx context.Context, agentUrl string, namespace string) (*view.ServiceNamesResponse, error)
	StartDiscovery(ctx context.Context, namespace string, workspaceId string, agentUrl string, failOnError bool) error
	ListServices_deprecated(ctx context.Context, namespace string, workspaceId string, agentUrl string) (*view.ServiceListResponse_deprecated, error)
	ListServices(ctx context.Context, namespace string, workspaceId string, agentUrl string) (*view.ServiceListResponse, error)
	GetServiceSpecification(ctx context.Context, namespace string, workspaceId string, serviceId string, fileId string, agentUrl string) ([]byte, error)
	SendEmptyServiceRequest(namespace string, serviceId string, agentUrl string, requestMethod string, requestPath string) (int, error)
}

func NewAgentClient(accessToken string) AgentClient {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}
	client := resty.NewWithClient(&cl)
	return &agentClientImpl{client: client, accessToken: accessToken}
}

const CustomApiKeyHeader = "X-Apihub-ApiKey"
const CustomProxyErrorHeader = "X-Apihub-Proxy-Error"

type agentClientImpl struct {
	client      *resty.Client
	accessToken string
}

func (a agentClientImpl) GetNamespaces(ctx context.Context, agentUrl string) (*view.AgentNamespaces, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v1/namespaces", agentUrl))
	if err != nil {
		return nil, fmt.Errorf("failed to get namespaces: %w", err)
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get namespaces: status code %d %v", resp.StatusCode(), err)
	}
	var namespaces view.AgentNamespaces
	err = json.Unmarshal(resp.Body(), &namespaces)
	if err != nil {
		return nil, err
	}
	return &namespaces, nil
}

func (a agentClientImpl) ListServiceNames(ctx context.Context, agentUrl string, namespace string) (*view.ServiceNamesResponse, error) {
	req := a.makeRequest(ctx)

	resp, err := req.Get(fmt.Sprintf("%s/api/v1/namespaces/%s/serviceNames", agentUrl, namespace))
	if err != nil {
		return nil, fmt.Errorf("failed to list service for namespace %s: %w", namespace, err)
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		if resp.StatusCode() == http.StatusFailedDependency {
			if customErr := checkCustomError(resp); customErr != nil {
				return nil, customErr
			}
		}
		return nil, fmt.Errorf("failed to get service names for namespace - %s: status code %d %v", namespace, resp.StatusCode(), err)
	}
	var serviceNames view.ServiceNamesResponse
	err = json.Unmarshal(resp.Body(), &serviceNames)
	if err != nil {
		return nil, err
	}
	return &serviceNames, nil
}

func (a agentClientImpl) StartDiscovery(ctx context.Context, namespace string, workspaceId string, agentUrl string, failOnError bool) error {
	req := a.makeRequest(ctx)
	resp, err := req.Post(fmt.Sprintf("%s/api/v2/namespaces/%s/workspaces/%s/discover?failOnError=%v", agentUrl, namespace, workspaceId, failOnError))
	if err != nil {
		return fmt.Errorf("failed to start discovery for namespace - %s. Error - %s", namespace, err.Error())
	}

	if resp.StatusCode() != http.StatusAccepted {
		if resp.StatusCode() == http.StatusNotFound {
			return nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return authErr
		}
		return fmt.Errorf("failed to start discovery for namespace - %s: status code %d %v", namespace, resp.StatusCode(), err)
	}
	return nil
}

func (a agentClientImpl) ListServices_deprecated(ctx context.Context, namespace string, workspaceId string, agentUrl string) (*view.ServiceListResponse_deprecated, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/namespaces/%s/workspaces/%s/services", agentUrl, namespace, workspaceId))
	if err != nil {
		return nil, fmt.Errorf("failed to get service for namespace - %s. Error - %s", namespace, err.Error())
	}

	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get service for namespace - %s: status code %d %v", namespace, resp.StatusCode(), err)
	}
	var serviceListResponse view.ServiceListResponse_deprecated
	err = json.Unmarshal(resp.Body(), &serviceListResponse)
	if err != nil {
		return nil, err
	}
	return &serviceListResponse, nil
}

func (a agentClientImpl) ListServices(ctx context.Context, namespace string, workspaceId string, agentUrl string) (*view.ServiceListResponse, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v3/namespaces/%s/workspaces/%s/services", agentUrl, namespace, workspaceId))
	if err != nil {
		return nil, fmt.Errorf("failed to get service for namespace - %s. Error - %s", namespace, err.Error())
	}

	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get service for namespace - %s: status code %d %v", namespace, resp.StatusCode(), err)
	}
	var serviceListResponse view.ServiceListResponse
	err = json.Unmarshal(resp.Body(), &serviceListResponse)
	if err != nil {
		return nil, err
	}
	return &serviceListResponse, nil
}

func (a agentClientImpl) GetServiceSpecification(ctx context.Context, namespace string, workspaceId string, serviceId string, fileId string, agentUrl string) ([]byte, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/namespaces/%s/workspaces/%s/services/%s/specs/%s", agentUrl, namespace, workspaceId, url.PathEscape(serviceId), url.PathEscape(fileId)))
	if err != nil {
		return nil, fmt.Errorf("failed to get service specification. Error - %s", err.Error())
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound || resp.StatusCode() == http.StatusFailedDependency {
			return nil, &exception.CustomError{
				Status:  http.StatusNotFound,
				Message: "failed to get service specification",
				Debug:   string(resp.Body()),
			}
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get service specification: status code %d %v", resp.StatusCode(), err)
	}

	return resp.Body(), nil
}

func (a agentClientImpl) SendEmptyServiceRequest(namespace string, serviceId string, agentUrl string, requestMethod string, requestPath string) (int, error) {
	req := a.client.R()
	req.SetHeader(CustomApiKeyHeader, a.accessToken)
	proxyUrl := fmt.Sprintf("%s/agents/agentId/namespaces/%s/services/%s/proxy/", agentUrl, url.PathEscape(namespace), url.PathEscape(serviceId))
	requestPath = strings.TrimPrefix(requestPath, "/")
	proxyUrl = proxyUrl + requestPath
	resp, err := req.Execute(strings.ToUpper(requestMethod), proxyUrl)
	if err != nil {
		return -1, fmt.Errorf("failed to execute '%v %v' request. Error - %s", requestMethod, proxyUrl, err.Error())
	}
	proxyError := resp.Header().Get(CustomProxyErrorHeader)
	if proxyError != "" {
		return -1, fmt.Errorf("failed to execute '%v %v' request. Agent proxy failed: %v", requestMethod, proxyUrl, proxyError)
	}
	return resp.StatusCode(), nil
}

func (a agentClientImpl) makeRequest(ctx context.Context) *resty.Request {
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

func checkCustomError(resp *resty.Response) error {
	if resp != nil && len(resp.Body()) > 0 {
		var customErr exception.CustomError
		jsonErr := json.Unmarshal(resp.Body(), &customErr)
		if jsonErr == nil && customErr.Code != "" && customErr.Message != "" {
			return &customErr
		}
	}
	return nil
}
