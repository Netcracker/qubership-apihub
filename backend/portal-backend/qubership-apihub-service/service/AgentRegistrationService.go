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
	"fmt"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type AgentRegistrationService interface {
	ProcessAgentSignal(view.AgentKeepaliveMessage) (*view.AgentVersion, error)
	ListAgents(onlyActive bool, showIncompatible bool) ([]view.AgentInstance, error)
	GetAgent(id string) (*view.AgentInstance, error)
}

func NewAgentRegistrationService(repository repository.AgentRepository) AgentRegistrationService {
	return &agentRegistrationServiceImpl{
		repository: repository,
	}
}

type agentRegistrationServiceImpl struct {
	repository repository.AgentRepository
}

const EXPECTED_AGENT_VERSION = "1.0.0"

func (a agentRegistrationServiceImpl) ProcessAgentSignal(message view.AgentKeepaliveMessage) (*view.AgentVersion, error) {
	ent := entity.AgentEntity{
		AgentId:        view.MakeAgentId(message.Cloud, message.Namespace),
		Cloud:          message.Cloud,
		Namespace:      message.Namespace,
		Url:            message.Url,
		BackendVersion: message.BackendVersion,
		Name:           message.Name,
		LastActive:     time.Now(),
		AgentVersion:   message.AgentVersion,
	}

	err := a.repository.CreateOrUpdateAgent(ent)
	if err != nil {
		return nil, err
	}
	return &view.AgentVersion{Version: EXPECTED_AGENT_VERSION}, nil
}

func (a agentRegistrationServiceImpl) ListAgents(onlyActive bool, showIncompatible bool) ([]view.AgentInstance, error) {
	ents, err := a.repository.ListAgents(onlyActive)
	if err != nil {
		return nil, err
	}

	result := make([]view.AgentInstance, 0)
	for _, ent := range ents {
		compErr := CheckAgentCompatibility(ent.AgentVersion)
		if !showIncompatible && compErr != nil {
			continue
		}
		agentView := entity.MakeAgentView(ent)
		agentView.CompatibilityError = compErr
		result = append(result, agentView)
	}

	return result, nil
}

func (a agentRegistrationServiceImpl) GetAgent(id string) (*view.AgentInstance, error) {
	ent, err := a.repository.GetAgent(id)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, nil
	}
	res := entity.MakeAgentView(*ent)
	res.CompatibilityError = CheckAgentCompatibility(ent.AgentVersion)
	return &res, nil
}

func CheckAgentCompatibility(actualAgentVersion string) *view.AgentCompatibilityError {
	if EXPECTED_AGENT_VERSION == actualAgentVersion {
		return nil
	}
	if actualAgentVersion == "" {
		return &view.AgentCompatibilityError{
			Severity: view.SeverityError,
			Message:  fmt.Sprintf("This Agent instance does not support versioning. Please, contact your System Administrator to update this Agent instance to version %s.", EXPECTED_AGENT_VERSION),
		}
	}
	backendVersion := strings.Split(EXPECTED_AGENT_VERSION, ".")
	actualVersion := strings.Split(actualAgentVersion, ".")
	if backendVersion[0] != actualVersion[0] {
		return &view.AgentCompatibilityError{
			Severity: view.SeverityError,
			Message:  fmt.Sprintf("Current version %s of Agent is incompatible with APIHUB. Please, contact your System Administrator to update this Agent instance to version %s.", actualAgentVersion, EXPECTED_AGENT_VERSION),
		}
	}
	if backendVersion[1] != actualVersion[1] || backendVersion[2] != actualVersion[2] {
		return &view.AgentCompatibilityError{
			Severity: view.SeverityWarning,
			Message:  fmt.Sprintf("Difference in minor/patch version of Agent detected. We recommend to contact your System Administrator to update this Agent instance to version %s.", EXPECTED_AGENT_VERSION),
		}
	}
	return nil
}
