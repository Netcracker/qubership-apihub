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

const SysadmRole = "System administrator"

const AdminRoleId = "admin"
const EditorRoleId = "editor"
const ViewerRoleId = "viewer"
const NoneRoleId = "none"

type PackageRole struct {
	RoleId      string   `json:"roleId"`
	RoleName    string   `json:"role"`
	ReadOnly    bool     `json:"readOnly,omitempty"`
	Permissions []string `json:"permissions"`
	Rank        int      `json:"rank"`
}

type PackageRoles struct {
	Roles []PackageRole `json:"roles"`
}

type PackageRoleCreateReq struct {
	Role        string   `json:"role" validate:"required"`
	Permissions []string `json:"permissions" validate:"required"`
}

type PackageRoleUpdateReq struct {
	Permissions *[]string `json:"permissions"`
}

type PackageRoleOrderReq struct {
	Roles []string `json:"roles" validate:"required"`
}
