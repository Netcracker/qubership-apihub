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
	"sort"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type RoleEntity struct {
	tableName struct{} `pg:"role"`

	Id          string   `pg:"id, pk, type:varchar"`
	Role        string   `pg:"role, type:varchar"`
	Permissions []string `pg:"permissions, type:varchar array, array, use_zero"`
	Rank        int      `pg:"rank, type:varchar"`
	ReadOnly    bool     `pg:"read_only, use_zero, type:boolean"`
}

type PackageMemberRoleEntity struct {
	tableName struct{} `pg:"package_member_role, alias:package_member_role"`

	PackageId string     `pg:"package_id, pk, type:varchar"`
	UserId    string     `pg:"user_id, pk, type:varchar"`
	Roles     []string   `pg:"roles, type:varchar array, array"`
	CreatedAt time.Time  `pg:"created_at, type:timestamp without time zone"`
	CreatedBy string     `pg:"created_by, type:varchar"`
	UpdatedAt *time.Time `pg:"updated_at, type:timestamp without time zone"`
	UpdatedBy string     `pg:"updated_by, type:varchar"`
}

type PackageMemberRoleRichEntity struct {
	PackageId   string `pg:"package_id, type:varchar"`
	PackageKind string `pg:"package_kind, type:varchar"`
	PackageName string `pg:"package_name, type:varchar"`
	UserId      string `pg:"user_id, type:varchar"`
	UserName    string `pg:"user_name, type:varchar"`
	UserEmail   string `pg:"user_email, type:varchar"`
	UserAvatar  string `pg:"user_avatar, type:varchar"`
	RoleId      string `pg:"role_id, type:varchar"`
	Role        string `pg:"role, type:varchar"`
}

func MakePackageMemberView(packageId string, memberRoles []PackageMemberRoleRichEntity) view.PackageMember {
	memberView := view.PackageMember{}
	roles := make([]view.PackageMemberRoleView, 0)
	for _, role := range memberRoles {
		if memberView.User.Id == "" {
			memberView.User = view.User{
				Id:        role.UserId,
				Email:     role.UserEmail,
				Name:      role.UserName,
				AvatarUrl: role.UserAvatar,
			}
		}
		roleView := view.PackageMemberRoleView{
			RoleId:   role.RoleId,
			RoleName: role.Role,
		}
		if packageId == role.PackageId {
			roleView.Inheritance = nil
		} else {
			roleView.Inheritance = &view.ShortPackage{
				PackageId: role.PackageId,
				Kind:      role.PackageKind,
				Name:      role.PackageName,
			}
		}
		roles = append(roles, roleView)
		sort.Slice(roles, func(i, j int) bool {
			return roles[i].RoleId < roles[j].RoleId
		})
	}
	memberView.Roles = roles
	return memberView
}

func MakeRoleView(ent RoleEntity) view.PackageRole {
	return view.PackageRole{
		RoleId:      ent.Id,
		RoleName:    ent.Role,
		ReadOnly:    ent.ReadOnly,
		Permissions: ent.Permissions,
		Rank:        ent.Rank,
	}
}
