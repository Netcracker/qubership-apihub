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

package controller

import (
	"encoding/base64"
	"encoding/json"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security/idp"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security/idp/providers"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/crewjam/saml/samlsp"
	log "github.com/sirupsen/logrus"
	"net/http"
	"net/url"
)

type SamlAuthController interface {
	AssertionConsumerHandler_deprecated(w http.ResponseWriter, r *http.Request)
	StartSamlAuthentication_deprecated(w http.ResponseWriter, r *http.Request)
	ServeMetadata_deprecated(w http.ResponseWriter, r *http.Request)
	GetSystemSSOInfo_deprecated(w http.ResponseWriter, r *http.Request)
}

func NewSamlAuthController(userService service.UserService, systemInfoService service.SystemInfoService, idpManager idp.Manager) SamlAuthController {
	var samlInstance *samlsp.Middleware
	for _, provider := range idpManager.GetAuthConfig().Providers {
		if provider.IdpType == idp.IDPTypeExternal && provider.Protocol == idp.AuthProtocolSAML {
			samlInstance, _ = providers.CreateSAMLInstance("", provider.SAMLConfiguration)
			break
		}
	}
	apihubURL, _ := url.Parse(systemInfoService.GetAPIHubUrl())
	return &authenticationControllerImpl{
		samlInstance:      samlInstance,
		userService:       userService,
		systemInfoService: systemInfoService,
		apihubHost:        apihubURL.Hostname(),
	}
}

type authenticationControllerImpl struct {
	samlInstance      *samlsp.Middleware
	userService       service.UserService
	systemInfoService service.SystemInfoService
	apihubHost        string
}

func (a *authenticationControllerImpl) ServeMetadata_deprecated(w http.ResponseWriter, r *http.Request) {
	providers.ServeMetadata(w, r, a.samlInstance)
}

// StartSamlAuthentication_deprecated Frontend calls this endpoint to SSO login user via SAML (legacy auth)
func (a *authenticationControllerImpl) StartSamlAuthentication_deprecated(w http.ResponseWriter, r *http.Request) {
	providers.StartSAMLAuthentication(w, r, a.samlInstance, a.apihubHost)
}

// AssertionConsumerHandler_deprecated This endpoint is called by ADFS when auth procedure is complete on it's side. ADFS posts the response here. (legacy auth)
func (a *authenticationControllerImpl) AssertionConsumerHandler_deprecated(w http.ResponseWriter, r *http.Request) {
	providers.HandleAssertion(w, r, a.userService, a.samlInstance, "", a.apihubHost, a.setUserViewCookie)
}

func (a *authenticationControllerImpl) setUserViewCookie(w http.ResponseWriter, user *view.User, idpId string) error {
	userView, err := security.CreateTokenForUser_deprecated(*user)
	if err != nil {
		return &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Failed to create token for SSO user",
			Debug:   err.Error(),
		}
	}

	response, _ := json.Marshal(userView)
	cookieValue := base64.StdEncoding.EncodeToString(response)

	http.SetCookie(w, &http.Cookie{
		Name:     "userView",
		Value:    cookieValue,
		MaxAge:   a.systemInfoService.GetRefreshTokenDurationSec(),
		Secure:   a.systemInfoService.IsProductionMode(),
		HttpOnly: false,
		Path:     "/",
	})
	//TODO: remove after IDP reconfiguration
	if a.systemInfoService.IsLegacySAML() {
		security.SetAuthTokenCookies(w, user, "/login/sso/saml")
	}
	log.Debugf("Auth user result object: %+v", userView)

	return nil
}

func (a *authenticationControllerImpl) GetSystemSSOInfo_deprecated(w http.ResponseWriter, r *http.Request) {
	utils.RespondWithJson(w, http.StatusOK,
		view.SystemConfigurationInfo_deprecated{
			SSOIntegrationEnabled: a.samlInstance != nil,
			AutoRedirect:          a.samlInstance != nil,
			DefaultWorkspaceId:    a.systemInfoService.GetDefaultWorkspaceId(),
		})
}
