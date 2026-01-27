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

package view

type Service_deprecated struct {
	Id                       string            `json:"id"`
	Name                     string            `json:"serviceName"`
	Url                      string            `json:"url"`
	Specs                    []Specification   `json:"specs"`
	Baseline                 *Baseline         `json:"baseline,omitempty"`
	Labels                   map[string]string `json:"serviceLabels,omitempty"`
	AvailablePromoteStatuses []string          `json:"availablePromoteStatuses"`
	ProxyServerUrl           string            `json:"proxyServerUrl,omitempty"`
}

type Service struct {
	Id                       string             `json:"id"`
	Name                     string             `json:"serviceName"`
	Url                      string             `json:"url"`
	Documents                []Document         `json:"documents"`
	Baseline                 *Baseline          `json:"baseline,omitempty"`
	Labels                   map[string]string  `json:"serviceLabels,omitempty"`
	AvailablePromoteStatuses []string           `json:"availablePromoteStatuses"`
	ProxyServerUrl           string             `json:"proxyServerUrl,omitempty"`
	Error                    string             `json:"error,omitempty"`
	DiagnosticInfo           *ServiceDiagnostic `json:"diagnosticInfo,omitempty"`
}

type EndpointCallInfo struct {
	Path         string `json:"path"`
	StatusCode   int    `json:"statusCode,omitempty"`
	ErrorSummary string `json:"errorSummary,omitempty"`
}

type ServiceDiagnostic struct {
	EndpointCalls []EndpointCallInfo `json:"endpointCalls,omitempty"`
	Skipped       bool               `json:"skipped,omitempty"`
	SkipReason    string             `json:"skipReason,omitempty"`
}
type Status string

const StatusNone Status = "none"
const StatusRunning Status = "running"
const StatusComplete Status = "complete"
const StatusError Status = "error"
const StatusFailed Status = "failed"

type ServiceListResponse_deprecated struct {
	Services []Service_deprecated `json:"services"`
	Status   Status               `json:"status"`
	Debug    string               `json:"debug"`
}

type ServiceListResponse struct {
	Services []Service `json:"services"`
	Status   Status    `json:"status"`
	Debug    string    `json:"debug"`
}

type ServiceNameItem struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type ServiceNamesResponse struct {
	ServiceNames []ServiceNameItem `json:"serviceNames"`
}

type Baseline struct {
	PackageId string   `json:"packageId"`
	Name      string   `json:"name"`
	Url       string   `json:"url"`
	Versions  []string `json:"versions"`
}
