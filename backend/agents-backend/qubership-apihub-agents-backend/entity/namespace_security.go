package entity

import (
	"time"

	"github.com/Netcracker/qubership-apihub-agents-backend/view"
)

type NamespaceSecurityCheckEntity struct {
	tableName struct{} `pg:"namespace_security_check, alias:namespace_security_check"`

	ProcessId   string     `pg:"process_id, pk, type:varchar"`
	AgentId     string     `pg:"agent_id, type:varchar"`
	Namespace   string     `pg:"namespace, type:varchar"`
	WorkspaceId string     `pg:"workspace_id, type:varchar"`
	CloudName   string     `pg:"cloud_name, type:varchar"`
	Status      string     `pg:"status, type:varchar"`
	Details     string     `pg:"details, type:varchar"`
	StartedAt   time.Time  `pg:"started_at, type:timestamp without time zone"`
	StartedBy   string     `pg:"started_by, type:varchar"`
	FinishedAt  *time.Time `pg:"finished_at, type:timestamp without time zone"`
}

type NamespaceSecurityCheckStatusEntity struct {
	tableName struct{} `pg:"namespace_security_check, alias:namespace_security_check"`

	NamespaceSecurityCheckEntity
	ServicesProcessed int `pg:"services_processed, type:integer"`
	ServicesTotal     int `pg:"services_total, type:integer"`
}

func MakeNamespaceSecurityCheckReportView(ent NamespaceSecurityCheckStatusEntity, user view.User, apiKey *view.ApihubApiKeyView) view.NamespaceSecurityCheckReport {
	var report = view.NamespaceSecurityCheckReport{
		Status:            ent.Status,
		ProcessId:         ent.ProcessId,
		CreatedAt:         ent.StartedAt,
		CreatedBy:         make(map[string]interface{}),
		ServicesProcessed: ent.ServicesProcessed,
		ServicesTotal:     ent.ServicesTotal,
		Details:           ent.Details,
	}
	if user.Id != "" {
		report.CreatedBy["type"] = "user"
		report.CreatedBy["id"] = user.Id
		report.CreatedBy["name"] = user.Name
		report.CreatedBy["email"] = user.Email
		report.CreatedBy["avatarUrl"] = user.AvatarUrl
	} else if apiKey != nil {
		report.CreatedBy["type"] = "apiKey"
		report.CreatedBy["id"] = apiKey.Id
		report.CreatedBy["name"] = apiKey.Name
	} else {
		report.CreatedBy["type"] = "user"
		report.CreatedBy["id"] = ent.StartedBy
	}
	return report
}

func MakeNamespaceSecurityCheckStatusView(ent NamespaceSecurityCheckStatusEntity) view.NamespaceSecurityCheckStatus {
	return view.NamespaceSecurityCheckStatus{
		Status:            ent.Status,
		ServicesProcessed: ent.ServicesProcessed,
		ServicesTotal:     ent.ServicesTotal,
		Details:           ent.Details,
	}
}

type NamespaceSecurityCheckServiceEntity struct {
	tableName struct{} `pg:"namespace_security_check_service, alias:namespace_security_check_service"`

	ProcessId       string `pg:"process_id, pk, type:varchar"`
	ServiceId       string `pg:"service_id, pk, type:varchar"`
	ApihubUrl       string `pg:"apihub_url, type:varchar"`
	PackageId       string `pg:"package_id, type:varchar"`
	Version         string `pg:"version, type:varchar"`
	EndpointsTotal  int    `pg:"endpoints_total, type:integer, use_zero"`
	EndpointsFailed int    `pg:"endpoints_failed, type:integer, use_zero"`
	Status          string `pg:"status, type:varchar"`
	Details         string `pg:"details, type:varchar"`
}

type NamespaceSecurityCheckResultEntity struct {
	tableName struct{} `pg:"namespace_security_check_result, alias:namespace_security_check_result"`

	ProcessId            string   `pg:"process_id, pk, type:varchar"`
	ServiceId            string   `pg:"service_id, pk, type:varchar"`
	Method               string   `pg:"method, pk, type:varchar"`
	Path                 string   `pg:"path, pk, type:varchar"`
	Security             []string `pg:"security, array, type:varchar[]"`
	Details              string   `pg:"details, type:varchar"`
	ActualResponseCode   int      `pg:"actual_response_code, type:integer, use_zero"`
	ExpectedResponseCode int      `pg:"expected_response_code, type:integer, use_zero"`
}
