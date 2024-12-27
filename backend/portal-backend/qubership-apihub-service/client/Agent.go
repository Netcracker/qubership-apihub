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
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"gopkg.in/resty.v1"
)

type AgentClient interface {
	GetNamespaces(ctx context.SecurityContext, agentUrl string) (*view.AgentNamespaces, error)
	ListServiceNames(ctx context.SecurityContext, agentUrl string, namespace string) (*view.ServiceNamesResponse, error)
}

func NewAgentClient() AgentClient {
	return &agentClientImpl{}
}

type agentClientImpl struct {
}

func (a agentClientImpl) ListServiceNames(ctx context.SecurityContext, agentUrl string, namespace string) (*view.ServiceNamesResponse, error) {
	req := a.makeRequest(ctx)

	resp, err := req.Get(fmt.Sprintf("%s/api/v1/namespaces/%s/serviceNames", agentUrl, namespace))
	if err != nil {
		return nil, fmt.Errorf("failed to list service for namespace %s: %w", namespace, err)
	}
	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("failed to list service for namespace %s: response status %v != 200", namespace, resp.StatusCode())
	}
	var serviceNames view.ServiceNamesResponse
	err = json.Unmarshal(resp.Body(), &serviceNames)
	if err != nil {
		return nil, err
	}
	return &serviceNames, nil
}

func (a agentClientImpl) GetNamespaces(ctx context.SecurityContext, agentUrl string) (*view.AgentNamespaces, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v1/namespaces", agentUrl))
	if err != nil {
		return nil, fmt.Errorf("failed to get namespaces: %w", err)
	}
	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("failed to get namespaces: response status %v != 200", resp.StatusCode())
	}
	var namespaces view.AgentNamespaces
	err = json.Unmarshal(resp.Body(), &namespaces)
	if err != nil {
		return nil, err
	}
	return &namespaces, nil
}

func (a agentClientImpl) makeRequest(ctx context.SecurityContext) *resty.Request {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}

	client := resty.NewWithClient(&cl)
	req := client.R()
	if ctx.GetUserToken() != "" {
		req.SetHeader("Authorization", fmt.Sprintf("Bearer %s", ctx.GetUserToken()))
	}
	if ctx.GetApiKey() != "" {
		req.SetHeader("api-key", ctx.GetApiKey())
	}
	return req
}
