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

import (
	"strings"
	"time"
)

type AgentKeepaliveMessage struct {
	Cloud          string `json:"cloud" validate:"required"`
	Namespace      string `json:"namespace" validate:"required"`
	Url            string `json:"url" validate:"required"`
	BackendVersion string `json:"backendVersion" validate:"required"`
	Name           string `json:"name"`
	AgentVersion   string `json:"agentVersion"`
}

type AgentStatus string

const AgentStatusActive AgentStatus = "active"
const AgentStatusInactive AgentStatus = "inactive"

type AgentInstance struct {
	AgentId                  string                   `json:"agentId"`
	AgentDeploymentCloud     string                   `json:"agentDeploymentCloud"`
	AgentDeploymentNamespace string                   `json:"agentDeploymentNamespace"`
	AgentUrl                 string                   `json:"agentUrl"`
	LastActive               time.Time                `json:"lastActive"`
	Status                   AgentStatus              `json:"status"`
	BackendVersion           string                   `json:"backendVersion"`
	Name                     string                   `json:"name"`
	AgentVersion             string                   `json:"agentVersion"`
	CompatibilityError       *AgentCompatibilityError `json:"compatibilityError,omitempty"`
}

func MakeAgentId(cloud, namespace string) string {
	return strings.ToLower(cloud) + "_" + strings.ToLower(namespace)
}

type AgentNamespaces struct {
	Namespaces []string `json:"namespaces"`
	CloudName  string   `json:"cloudName"`
}

type AgentVersion struct {
	Version string `json:"version"`
}

type AgentCompatibilityError struct {
	Severity AgentCompatibilityErrorSeverity `json:"severity"`
	Message  string                          `json:"message"`
}

type AgentCompatibilityErrorSeverity string

const SeverityError AgentCompatibilityErrorSeverity = "error"
const SeverityWarning AgentCompatibilityErrorSeverity = "warning"
