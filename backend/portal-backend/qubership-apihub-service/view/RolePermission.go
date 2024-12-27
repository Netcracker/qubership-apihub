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

type RolePermission string

const (
	ReadPermission                   RolePermission = "read"
	CreateAndUpdatePackagePermission RolePermission = "create_and_update_package"
	DeletePackagePermission          RolePermission = "delete_package"
	ManageDraftVersionPermission     RolePermission = "manage_draft_version"
	ManageReleaseVersionPermission   RolePermission = "manage_release_version"
	ManageArchivedVersionPermission  RolePermission = "manage_archived_version"
	UserAccessManagementPermission   RolePermission = "user_access_management"
	AccessTokenManagementPermission  RolePermission = "access_token_management"
)

func GetAllRolePermissions() []RolePermission {
	return []RolePermission{
		ReadPermission,
		CreateAndUpdatePackagePermission,
		DeletePackagePermission,
		ManageDraftVersionPermission,
		ManageReleaseVersionPermission,
		ManageArchivedVersionPermission,
		UserAccessManagementPermission,
		AccessTokenManagementPermission,
	}
}

func (r RolePermission) Id() string {
	return string(r)
}

func (r RolePermission) Name() string {
	switch r {
	case ReadPermission:
		return "read content of public packages"
	case CreateAndUpdatePackagePermission:
		return "create, update group/package"
	case DeletePackagePermission:
		return "delete group/package"
	case ManageDraftVersionPermission:
		return "manage version in draft status"
	case ManageReleaseVersionPermission:
		return "manage version in release status"
	case ManageArchivedVersionPermission:
		return "manage version in archived status"
	case UserAccessManagementPermission:
		return "user access management"
	case AccessTokenManagementPermission:
		return "access token management"
	default:
		return ""
	}
}

func ParseRolePermission(permissionId string) (RolePermission, error) {
	switch permissionId {
	case "read":
		return ReadPermission, nil
	case "create_and_update_package":
		return CreateAndUpdatePackagePermission, nil
	case "delete_package":
		return DeletePackagePermission, nil
	case "manage_draft_version":
		return ManageDraftVersionPermission, nil
	case "manage_release_version":
		return ManageReleaseVersionPermission, nil
	case "manage_archived_version":
		return ManageArchivedVersionPermission, nil
	case "user_access_management":
		return UserAccessManagementPermission, nil
	case "access_token_management":
		return AccessTokenManagementPermission, nil
	default:
		return "", fmt.Errorf("permission '%v' doesn't exist", permissionId)
	}
}

type Permission struct {
	PermissionId string `json:"permission"`
	Name         string `json:"name"`
}

type Permissions struct {
	Permissions []Permission `json:"permissions"`
}
