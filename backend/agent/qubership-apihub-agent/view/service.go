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

import "fmt"

type Service struct {
	Id                       string            `json:"id"`
	Name                     string            `json:"serviceName"`
	Url                      string            `json:"url"`
	Documents                []Document        `json:"specs"` //todo change json name
	Baseline                 *Baseline         `json:"baseline,omitempty"`
	Labels                   map[string]string `json:"serviceLabels,omitempty"`
	AvailablePromoteStatuses []string          `json:"availablePromoteStatuses"`
	ProxyServerUrl           string            `json:"proxyServerUrl,omitempty"`
	Error                    string            `json:"error,omitempty"`
}

type ServiceItem struct {
	Id             string            `json:"id"`
	Namespace      string            `json:"namespace"`
	Name           string            `json:"serviceName"`
	Url            string            `json:"url"`
	Labels         map[string]string `json:"serviceLabels,omitempty"`
	Annotations    map[string]string `json:"serviceAnnotations,omitempty"`
	Pods           []string          `json:"servicePods,omitempty"`
	ProxyServerUrl string            `json:"proxyServerUrl,omitempty"`
}

type StatusEnum string

const StatusNone StatusEnum = "none"
const StatusRunning StatusEnum = "running"
const StatusComplete StatusEnum = "complete"
const StatusError StatusEnum = "error"

type ServiceListResponse struct {
	Services []Service  `json:"services"`
	Status   StatusEnum `json:"status"`
	Debug    string     `json:"debug"`
}

type Baseline struct {
	PackageId string   `json:"packageId"`
	Name      string   `json:"name"`
	Url       string   `json:"url"`
	Versions  []string `json:"versions"`
}

func BuildStatusFromString(str string) (StatusEnum, error) {
	switch str {
	case "none":
		return StatusNone, nil
	case "running":
		return StatusRunning, nil
	case "complete":
		return StatusComplete, nil
	case "error":
		return StatusError, nil
	}
	return StatusNone, fmt.Errorf("unknown build status: %s", str)
}

type ServiceNameItem struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type ServiceNamesResponse struct {
	ServiceNames []ServiceNameItem `json:"serviceNames"`
}

type ServiceItemsResponse struct {
	ServiceItems []ServiceItem `json:"serviceItems"`
}
