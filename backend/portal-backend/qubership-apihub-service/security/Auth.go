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

package security

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/controller"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/jwt"
	"github.com/shaj13/go-guardian/v2/auth/strategies/token"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/fifo"
	_ "github.com/shaj13/libcache/lru"

	"time"
)

var apihubApiKeyStrategy auth.Strategy
var jwtStrategy auth.Strategy
var strategy union.Union
var keeper jwt.SecretsKeeper
var integrationService service.IntegrationsService
var userService service.UserService
var roleService service.RoleService
var systemInfoService service.SystemInfoService

var customJwtStrategy auth.Strategy

const CustomJwtAuthHeader = "X-Apihub-Authorization"

var publicKey []byte

const gitIntegrationExt = "gitIntegration"

func SetupGoGuardian(intService service.IntegrationsService, userServiceLocal service.UserService, roleServiceLocal service.RoleService, apiKeyService service.ApihubApiKeyService, patService service.PersonalAccessTokenService, systemService service.SystemInfoService) error {
	integrationService = intService
	userService = userServiceLocal
	roleService = roleServiceLocal
	apihubApiKeyStrategy = NewApihubApiKeyStrategy(apiKeyService)
	personalAccessTokenStrategy := NewApihubPATStrategy(patService)
	systemInfoService = systemService

	block, _ := pem.Decode(systemInfoService.GetJwtPrivateKey())
	pkcs8PrivateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return fmt.Errorf("can't parse pkcs1 private key. Error - %s", err.Error())
	}
	privateKey, ok := pkcs8PrivateKey.(*rsa.PrivateKey)
	if !ok {
		return fmt.Errorf("can't parse pkcs8 private key to rsa.PrivateKey. Error - %s", err.Error())
	}
	publicKey = x509.MarshalPKCS1PublicKey(&privateKey.PublicKey)

	keeper = jwt.StaticSecret{
		ID:        "secret-id",
		Secret:    privateKey,
		Algorithm: jwt.RS256,
	}

	cache := libcache.LRU.New(1000)
	cache.SetTTL(time.Minute * 60)
	cache.RegisterOnExpired(func(key, _ interface{}) {
		cache.Delete(key)
	})
	jwtStrategy = jwt.New(cache, keeper)
	strategy = union.New(jwtStrategy, apihubApiKeyStrategy, personalAccessTokenStrategy)
	customJwtStrategy = jwt.New(cache, keeper, token.SetParser(token.XHeaderParser(CustomJwtAuthHeader)))
	return nil
}

type UserView struct {
	AccessToken string    `json:"token"`
	RenewToken  string    `json:"renewToken"`
	User        view.User `json:"user"`
}

func CreateLocalUserToken(w http.ResponseWriter, r *http.Request) {
	email, password, ok := r.BasicAuth()
	if !ok {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusUnauthorized,
			Message: http.StatusText(http.StatusUnauthorized),
		})
		return
	}
	user, err := userService.AuthenticateUser(email, password)
	if err != nil {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusUnauthorized,
			Message: http.StatusText(http.StatusUnauthorized),
			Debug:   err.Error(),
		})
		return
	}
	userView, err := CreateTokenForUser(*user)
	if err != nil {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusUnauthorized,
			Message: http.StatusText(http.StatusUnauthorized),
			Debug:   err.Error(),
		})
		return
	}

	response, _ := json.Marshal(userView)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(response)
}

func CreateTokenForUser(dbUser view.User) (*UserView, error) {
	user := auth.NewUserInfo(dbUser.Name, dbUser.Id, []string{}, auth.Extensions{})
	accessDuration := jwt.SetExpDuration(time.Hour * 12) // should be more than one minute!

	status, err := integrationService.GetUserApiKeyStatus(view.GitlabIntegration, dbUser.Id)
	if err != nil {
		return nil, fmt.Errorf("failed to check gitlab integration status: %v", err)
	}
	extensions := user.GetExtensions()

	gitIntegrationExtensionValue := "false"
	if status.Status == service.ApiKeyStatusPresent {
		gitIntegrationExtensionValue = "true"
	}
	systemRole, err := roleService.GetUserSystemRole(user.GetID())
	if err != nil {
		return nil, fmt.Errorf("failed to check user system role: %v", err.Error())
	}
	if systemRole != "" {
		extensions.Set(context.SystemRoleExt, systemRole)
	}
	extensions.Set(gitIntegrationExt, gitIntegrationExtensionValue)
	user.SetExtensions(extensions)

	token, err := jwt.IssueAccessToken(user, keeper, accessDuration)

	if err != nil {
		return nil, err
	}

	renewDuration := jwt.SetExpDuration(time.Hour * 24 * 30) // approximately one month
	renewToken, err := jwt.IssueAccessToken(user, keeper, renewDuration)
	if err != nil {
		return nil, err
	}

	userView := UserView{AccessToken: token, RenewToken: renewToken, User: dbUser}
	return &userView, nil
}

func GetPublicKey() []byte {
	return publicKey
}
