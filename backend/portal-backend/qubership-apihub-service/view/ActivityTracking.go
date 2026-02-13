package view

import "time"

type ActivityTrackingEvent struct {
	Type      ATEventType            `json:"eventType,omitempty"`
	Data      map[string]interface{} `json:"params,omitempty"`
	PackageId string                 `json:"packageId,omitempty"`
	Date      time.Time              `json:"date"`
	UserId    string                 `json:"userId,omitempty"`
}

type PkgActivityResponseItem struct {
	PackageName string                 `json:"packageName"`
	PackageKind string                 `json:"kind"`
	Principal   map[string]interface{} `json:"principal,omitempty"`
	ActivityTrackingEvent
}
type PkgActivityResponse struct {
	Events []PkgActivityResponseItem `json:"events"`
}

type ActivityHistoryReq struct {
	OnlyFavorite bool
	TextFilter   string
	Types        []string
	Limit        int
	Page         int
	OnlyShared   bool
	Kind         []string
}

type ATEventType string

// access control

const ATETGrantRole ATEventType = "grant_role"
const ATETUpdateRole ATEventType = "update_role"
const ATETDeleteRole ATEventType = "delete_role"

// Apihub API keys

const ATETGenerateApiKey ATEventType = "generate_api_key"
const ATETRevokeApiKey ATEventType = "revoke_api_key"

// package actions

const ATETPatchPackageMeta ATEventType = "patch_package_meta"
const ATETCreatePackage ATEventType = "create_package"
const ATETDeletePackage ATEventType = "delete_package"

// publish/versioning

const ATETPublishNewVersion ATEventType = "publish_new_version"
const ATETPublishNewRevision ATEventType = "publish_new_revision"
const ATETPatchVersionMeta ATEventType = "patch_version_meta"
const ATETDeleteVersion ATEventType = "delete_version"
const ATETDeleteRevision ATEventType = "delete_revision"

// manual groups

const ATETCreateManualGroup ATEventType = "create_manual_group"
const ATETDeleteManualGroup ATEventType = "delete_manual_group"
const ATETOperationsGroupParameters ATEventType = "update_operations_group_parameters"

func ConvertEventTypes(input []string) []string {
	var output []string
	for _, iType := range input {
		switch iType {
		case "package_members":
			output = append(output, string(ATETGrantRole), string(ATETUpdateRole), string(ATETDeleteRole))
		case "package_security":
			output = append(output, string(ATETGenerateApiKey), string(ATETRevokeApiKey))
		case "new_version":
			output = append(output, string(ATETPublishNewVersion))
		case "package_version":
			output = append(output, string(ATETPublishNewRevision), string(ATETPatchVersionMeta), string(ATETDeleteVersion), string(ATETDeleteRevision))
		case "package_management":
			output = append(output, string(ATETPatchPackageMeta), string(ATETCreatePackage), string(ATETDeletePackage))
		case "operations_group":
			output = append(output, string(ATETCreateManualGroup), string(ATETDeleteManualGroup), string(ATETOperationsGroupParameters))
		}
	}
	return output
}

type EventRoleView struct {
	RoleId string `json:"roleId"`
	Role   string `json:"role"`
}
