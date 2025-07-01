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
	"strconv"
	"strings"

	"github.com/shaj13/go-guardian/v2/auth"
)

const SystemRoleExt = "systemRole"
const ApikeyRoleExt = "apikeyRole"
const ApikeyPackageIdExt = "apikeyPackageId"
const ApikeyIdExt = "apikeyId"
const TokenExpiresAtExt = "expiresAt"

type SecurityContext interface {
	GetUserId() string
	GetUserSystemRole() string
	GetApikeyRoles() []string
	GetApikeyPackageId() string
	GetUserToken() string
	GetTokenExpirationTimestamp() int64
	GetApiKey() string
	GetApiKeyId() string
}

func Create(r *http.Request) SecurityContext {
	user := auth.User(r)
	userId := user.GetID()
	systemRole := user.GetExtensions().Get(SystemRoleExt)
	apikeyId := user.GetExtensions().Get(ApikeyIdExt)
	apikeyRole := user.GetExtensions().Get(ApikeyRoleExt)
	apikeyPackageId := user.GetExtensions().Get(ApikeyPackageIdExt)
	tokenExpirationTimestamp, _ := strconv.ParseInt(user.GetExtensions().Get(TokenExpiresAtExt), 0, 64)
	token := getAccessToken(r)
	if token != "" {
		return &securityContextImpl{
			userId:                   userId,
			systemRole:               systemRole,
			apikeyPackageId:          apikeyPackageId,
			apikeyRole:               apikeyRole,
			token:                    token,
			tokenExpirationTimestamp: tokenExpirationTimestamp,
			apiKey:                   "",
			apikeyId:                 "",
		}
	} else {
		return &securityContextImpl{
			userId:          userId,
			systemRole:      systemRole,
			apikeyPackageId: apikeyPackageId,
			apikeyRole:      apikeyRole,
			token:           "",
			apikeyId:        apikeyId,
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
	userId                   string
	systemRole               string
	apikeyRole               string
	apikeyPackageId          string
	token                    string
	tokenExpirationTimestamp int64
	apikeyId                 string
	apiKey                   string
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

func getAccessToken(r *http.Request) string {
	if token := getTokenFromAuthHeader(r); token != "" {
		return token
	}
	return getTokenFromCookie(r)
}

func getTokenFromAuthHeader(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		return ""
	}
	return strings.TrimSpace(authHeader[7:])
}

func getTokenFromCookie(r *http.Request) string {
	accessTokenCookie, err := r.Cookie("apihub-access-token")
	if err != nil {
		return ""
	}

	return accessTokenCookie.Value
}

func getApihubApiKey(r *http.Request) string {
	return r.Header.Get("api-key")
}

func (ctx securityContextImpl) GetUserToken() string {
	return ctx.token
}
func (ctx securityContextImpl) GetTokenExpirationTimestamp() int64 {
	return ctx.tokenExpirationTimestamp
}

func (ctx securityContextImpl) GetApiKey() string {
	return ctx.apiKey
}

func (ctx securityContextImpl) GetApiKeyId() string {
	return ctx.apikeyId
}
