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
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"net/url"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/controller"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/go-resty/resty/v2"
	log "github.com/sirupsen/logrus"
)

type Oauth20Controller interface {
	GitlabOauthCallback(w http.ResponseWriter, r *http.Request)
	StartOauthProcessWithGitlab(w http.ResponseWriter, r *http.Request)
}

func NewOauth20Controller(integrationService service.IntegrationsService, userService service.UserService, systemInfoService service.SystemInfoService) Oauth20Controller {
	return &oauth20ControllerImpl{
		integrationService: integrationService,
		userService:        userService,
		systemInfoService:  systemInfoService,
		clientId:           systemInfoService.GetClientID(),
		clientSecret:       systemInfoService.GetClientSecret(),
		gitlabUrl:          systemInfoService.GetGitlabUrl(),
	}
}

type oauth20ControllerImpl struct {
	integrationService service.IntegrationsService
	userService        service.UserService
	systemInfoService  service.SystemInfoService
	clientId           string
	clientSecret       string
	gitlabUrl          string
}

type GitlabUserInfo struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Name     string `json:"name"`
}

const gitlabOauthTokenUri string = "/oauth/token"

const gitlabOauthAuthorize string = "/oauth/authorize"
const gitlabUserUri string = "/api/v4/user"

func (o oauth20ControllerImpl) GitlabOauthCallback(w http.ResponseWriter, r *http.Request) {
	code := r.FormValue("code")
	if code == "" {
		log.Error("Gitlab access code is empty")
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Access code from gitlab is empty",
		})
		return
	}
	redirectUri := r.URL.Query().Get("redirectUri")
	if redirectUri == "" {
		redirectUri = "/"
	} else {
		url, _ := url.Parse(redirectUri)
		var validHost bool
		for _, host := range o.systemInfoService.GetAllowedHosts() {
			if strings.Contains(url.Host, host) {
				validHost = true
				break
			}
		}
		if !validHost {
			controller.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.HostNotAllowed,
				Message: exception.HostNotAllowedMsg,
				Params:  map[string]interface{}{"host": redirectUri},
			})
			return
		}
	}

	req := makeRequest()
	authRedirectUri := fmt.Sprintf("%s%s", o.systemInfoService.GetAPIHubUrl(), "/login/ncgitlab/callback?redirectUri="+redirectUri)
	//todo move query parameters to body with Content-Type: application/x-www-form-urlencoded https://www.rfc-editor.org/rfc/rfc6749#section-4.1.3
	url := fmt.Sprintf("%s%s?client_id=%s&client_secret=%s&code=%s&grant_type=authorization_code&redirect_uri=%s",
		o.gitlabUrl, gitlabOauthTokenUri, o.clientId, o.clientSecret, code, authRedirectUri)

	resp, err := req.Post(url)
	if resp.StatusCode() == http.StatusNotFound {
		log.Error("Couldn't call gitlab Oauth2.0 rest url")
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Message: "Couldn't call gitlab Oauth2.0 rest url",
			Debug:   err.Error()})
		return
	}
	if err != nil || resp.StatusCode() != http.StatusOK {
		log.Errorf("Failed to get access token from gitlab: status code %d %v", resp.StatusCode(), err)
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  resp.StatusCode(),
			Message: "Failed to get access token from gitlab",
			Debug:   err.Error()})
		return
	}

	var gitlabOauthAccessResponse view.OAuthAccessResponse
	if err := json.Unmarshal(resp.Body(), &gitlabOauthAccessResponse); err != nil {
		log.Errorf("Couldn't parse JSON response from gitlab Oauth: %v", err)
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Couldn't parse JSON response from gitlab Oauth",
			Debug:   err.Error()})
		return
	}
	expiresIn := view.GetTokenExpirationDate(gitlabOauthAccessResponse.ExpiresIn)

	accessToken := gitlabOauthAccessResponse.AccessToken
	gitlabUser, err := getUserByToken(o.gitlabUrl, accessToken)

	if err != nil {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Couldn't get username from gitlab",
			Debug:   err.Error()})
		return
	}
	user, err := o.userService.GetOrCreateUserForIntegration(view.User{Id: gitlabUser.Username, Email: gitlabUser.Email, Name: gitlabUser.Name}, view.ExternalGitlabIntegration)
	if err != nil {
		controller.RespondWithError(w, "Failed to login via gitlab", err)
		return
	}
	err = o.integrationService.SetOauthGitlabTokenForUser(view.GitlabIntegration, user.Id, accessToken, gitlabOauthAccessResponse.RefreshToken, expiresIn, authRedirectUri)
	if err != nil {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "failed to set oauth token for user - $user",
			Debug:   err.Error(),
			Params:  map[string]interface{}{"user": user.Id},
		})
		return
	}

	userView, err := CreateTokenForUser(*user)
	if err != nil {
		log.Errorf("Create token for saml process has error -%s", err.Error())
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Create token for saml process has error - $error",
			Params:  map[string]interface{}{"error": err.Error()},
		})
		return
	}

	response, _ := json.Marshal(userView)
	cookieValue := base64.StdEncoding.EncodeToString(response)

	http.SetCookie(w, &http.Cookie{
		Name:     "userView",
		Value:    cookieValue,
		MaxAge:   int((time.Hour * 12).Seconds()),
		Secure:   true,
		HttpOnly: false,
		Path:     "/",
	})
	http.Redirect(w, r, redirectUri, http.StatusFound)
}

func (o oauth20ControllerImpl) StartOauthProcessWithGitlab(w http.ResponseWriter, r *http.Request) {
	redirectUri := r.URL.Query().Get("redirectUri")
	if redirectUri == "" {
		redirectUri = "/"
	} else {
		url, _ := url.Parse(redirectUri)
		var validHost bool
		for _, host := range o.systemInfoService.GetAllowedHosts() {
			if strings.Contains(url.Host, host) {
				validHost = true
				break
			}
		}
		if !validHost {
			controller.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.HostNotAllowed,
				Message: exception.HostNotAllowedMsg,
				Params:  map[string]interface{}{"host": redirectUri},
			})
			return
		}
	}

	fullRedirectUrl := fmt.Sprintf("%s%s?redirectUri=%s", o.systemInfoService.GetAPIHubUrl(), "/login/ncgitlab/callback", redirectUri)
	http.Redirect(w, r, fmt.Sprintf("%s%s?client_id=%s&response_type=code&redirect_uri=%s", o.gitlabUrl, gitlabOauthAuthorize, o.clientId, fullRedirectUrl), http.StatusFound)
}

func getUserByToken(gitlabUrl string, oauthToken string) (*GitlabUserInfo, error) {
	req := makeRequest()
	resp, err := req.Get(fmt.Sprintf("%s%s?access_token=%s", gitlabUrl, gitlabUserUri, oauthToken))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode() == http.StatusNotFound {
		return nil, fmt.Errorf("couldn't call gitlab Oauth2.0 rest url - %d", resp.StatusCode())
	}
	if err != nil || resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("failed to get access token from gitlab: status code %d %v", resp.StatusCode(), err)
	}
	var gitlabUserInfo GitlabUserInfo
	if err := json.Unmarshal(resp.Body(), &gitlabUserInfo); err != nil {
		return nil, fmt.Errorf("couldn't parse JSON response from gitlab user: %s", err.Error())

	}
	return &gitlabUserInfo, nil
}

func makeRequest() *resty.Request {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}
	client := resty.NewWithClient(&cl)
	req := client.R()
	req.SetHeader("accept", "application/json")
	return req
}
