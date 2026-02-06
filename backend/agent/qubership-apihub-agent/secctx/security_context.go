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

package secctx

import (
	"net/http"
	"strings"

	"github.com/shaj13/go-guardian/v2/auth"
)

const SystemRoleExt = "systemRole"

type SecurityContext interface {
	GetUserId() string
	GetUserToken() string
	IsSysadm() bool
}

func Create(r *http.Request) SecurityContext {
	user := auth.User(r)
	userId := user.GetID()
	token := getAuthorizationToken(r)
	sysRoles := user.GetExtensions().Values(SystemRoleExt)
	return &securityContextImpl{
		userId:      userId,
		token:       token,
		systemRoles: sysRoles,
	}
}

func CreateSystemContext() SecurityContext {
	return &securityContextImpl{userId: "system", token: ""}
}

type securityContextImpl struct {
	userId      string
	token       string
	systemRoles []string
}

func getAuthorizationToken(r *http.Request) string {
	authorizationHeaderValue := r.Header.Get("authorization")
	return strings.ReplaceAll(authorizationHeaderValue, "Bearer ", "")
}

func (ctx securityContextImpl) GetUserId() string {
	return ctx.userId
}
func (ctx securityContextImpl) GetUserToken() string {
	return ctx.token
}

func (ctx securityContextImpl) IsSysadm() bool {
	for _, role := range ctx.systemRoles {
		if role == "System administrator" {
			return true
		}
	}
	return false
}
