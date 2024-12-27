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

const ActionAddRole = "add"
const ActionRemoveRole = "remove"

type PackageMemberRoleView struct {
	RoleId      string        `json:"roleId"`
	RoleName    string        `json:"role"`
	Inheritance *ShortPackage `json:"inheritance,omitempty"`
}

type PackageMember struct {
	User  User                    `json:"user"`
	Roles []PackageMemberRoleView `json:"roles"`
}

type PackageMembers struct {
	Members []PackageMember `json:"members"`
}

type ShortPackage struct {
	PackageId string `json:"packageId"`
	Kind      string `json:"kind"`
	Name      string `json:"name"`
}

type AvailablePackagePromoteStatuses map[string][]string // map[packageId][]version status

type PackageMembersAddReq struct {
	Emails  []string `json:"emails" validate:"required"`
	RoleIds []string `json:"roleIds" validate:"required"`
}

type PackageMemberUpdatePatch struct {
	RoleId string `json:"roleId" validate:"required"`
	Action string `json:"action" validate:"required"`
}

type PackagesReq struct {
	Packages []string `json:"packages"`
}
