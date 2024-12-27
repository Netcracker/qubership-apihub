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

package context

import (
	"net/http"
	"strings"

	"github.com/shaj13/go-guardian/v2/auth"
)

const SystemRoleExt = "systemRole"
const ApikeyRoleExt = "apikeyRole"
const ApikeyPackageIdExt = "apikeyPackageId"

type SecurityContext interface {
	GetUserId() string
	GetUserSystemRole() string
	GetApikeyRoles() []string
	GetApikeyPackageId() string
	GetUserToken() string
	GetApiKey() string
}

func Create(r *http.Request) SecurityContext {
	user := auth.User(r)
	userId := user.GetID()
	systemRole := user.GetExtensions().Get(SystemRoleExt)
	apikeyRole := user.GetExtensions().Get(ApikeyRoleExt)
	apikeyPackageId := user.GetExtensions().Get(ApikeyPackageIdExt)
	token := getAuthorizationToken(r)
	if token != "" {
		return &securityContextImpl{
			userId:          userId,
			systemRole:      systemRole,
			apikeyPackageId: apikeyPackageId,
			apikeyRole:      apikeyRole,
			token:           token,
			apiKey:          "",
		}
	} else {
		return &securityContextImpl{
			userId:          userId,
			systemRole:      systemRole,
			apikeyPackageId: apikeyPackageId,
			apikeyRole:      apikeyRole,
			token:           "",
			apiKey:          getApihubApiKey(r),
		}
	}
}

func CreateSystemContext() SecurityContext {
	return &securityContextImpl{userId: "system"}
}

func CreateFromId(userId string) SecurityContext {
	return &securityContextImpl{
		userId: userId,
	}
}

type securityContextImpl struct {
	userId          string
	systemRole      string
	apikeyRole      string
	apikeyPackageId string
	token           string
	apiKey          string
}

func (ctx securityContextImpl) GetUserId() string {
	return ctx.userId
}

func (ctx securityContextImpl) GetUserSystemRole() string {
	return ctx.systemRole
}

func (ctx securityContextImpl) GetApikeyRoles() []string {
	if ctx.apikeyRole == "" {
		return []string{}
	}
	return SplitApikeyRoles(ctx.apikeyRole)
}

func (ctx securityContextImpl) GetApikeyPackageId() string {
	return ctx.apikeyPackageId
}

func SplitApikeyRoles(roles string) []string {
	return strings.Split(roles, ",")
}

func MergeApikeyRoles(roles []string) string {
	return strings.Join(roles, ",")
}

func getAuthorizationToken(r *http.Request) string {
	authorizationHeaderValue := r.Header.Get("authorization")
	return strings.ReplaceAll(authorizationHeaderValue, "Bearer ", "")
}

func getApihubApiKey(r *http.Request) string {
	return r.Header.Get("api-key")
}

func (ctx securityContextImpl) GetUserToken() string {
	return ctx.token
}

func (ctx securityContextImpl) GetApiKey() string {
	return ctx.apiKey
}
