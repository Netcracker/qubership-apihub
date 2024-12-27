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

package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type AgentEntity struct {
	tableName struct{} `pg:"agent"`

	AgentId        string    `pg:"agent_id, pk, type:varchar"`
	Cloud          string    `pg:"cloud, type:varchar"`
	Namespace      string    `pg:"namespace, type:varchar"`
	Url            string    `pg:"url, type:varchar"`
	BackendVersion string    `pg:"backend_version, type:varchar"`
	LastActive     time.Time `pg:"last_active, type:timestamp without time zone"`
	Name           string    `pg:"name, type:varchar"`
	AgentVersion   string    `pg:"agent_version, type:varchar"`
}

func MakeAgentView(ent AgentEntity) view.AgentInstance {
	status := view.AgentStatusActive
	if time.Since(ent.LastActive) > time.Second*60 {
		status = view.AgentStatusInactive
	}
	name := ent.Name
	if name == "" {
		name = ent.Namespace + "." + ent.Cloud
	}

	return view.AgentInstance{
		AgentId:                  ent.AgentId,
		AgentDeploymentCloud:     ent.Cloud,
		AgentDeploymentNamespace: ent.Namespace,
		AgentUrl:                 ent.Url,
		LastActive:               ent.LastActive,
		Status:                   status,
		BackendVersion:           ent.BackendVersion,
		Name:                     name,
		AgentVersion:             ent.AgentVersion,
	}
}
