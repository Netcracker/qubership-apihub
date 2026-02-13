package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub-agents-backend/view"
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
	if time.Since(ent.LastActive) > time.Second*30 {
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
