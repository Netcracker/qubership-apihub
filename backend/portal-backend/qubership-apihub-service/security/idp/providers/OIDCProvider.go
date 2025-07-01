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

package providers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security/idp"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/coreos/go-oidc/v3/oidc"
	log "github.com/sirupsen/logrus"
	"golang.org/x/oauth2"
	"io"
	"net/http"
	"net/url"
	"time"
)

const SSOLoginRefreshPathTemplate = "/api/v1/login/sso/%s"

type oidcProvider struct {
	config         idp.IDP
	provider       *oidc.Provider
	verifier       *oidc.IDTokenVerifier
	oAuth2Config   oauth2.Config
	userService    service.UserService
	allowedHosts   []string
	apihubHost     string
	productionMode bool
}

func newOIDCProvider(config idp.IDP, provider *oidc.Provider, verifier *oidc.IDTokenVerifier, oAuth2Config oauth2.Config, userService service.UserService, allowedHosts []string, apihubHost string, productionMode bool) idp.Provider {
	return &oidcProvider{
		config:         config,
		provider:       provider,
		verifier:       verifier,
		oAuth2Config:   oAuth2Config,
		userService:    userService,
		allowedHosts:   allowedHosts,
		apihubHost:     apihubHost,
		productionMode: productionMode,
	}
}

func (o oidcProvider) StartAuthentication(w http.ResponseWriter, r *http.Request) {
	redirectUrlStr := r.URL.Query().Get("redirectUri")

	log.Debugf("redirect url - %s", redirectUrlStr)

	redirectUrl, err := url.Parse(redirectUrlStr)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectRedirectUrlError,
			Message: exception.IncorrectRedirectUrlErrorMsg,
			Params:  map[string]interface{}{"url": redirectUrl, "error": err.Error()},
		})
		return
	}

	if redirectUrl.Hostname() != o.apihubHost {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.HostNotAllowed,
			Message: exception.HostNotAllowedMsg,
			Params:  map[string]interface{}{"host": redirectUrl.Hostname()},
		})
		return
	}

	state, err := o.generateState()
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCAuthenticationFailed,
			Message: exception.OIDCAuthenticationFailedMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		})
		return
	}
	nonce, err := o.generateNonce()
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCAuthenticationFailed,
			Message: exception.OIDCAuthenticationFailedMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		})
		return
	}
	codeVerifier, err := o.generateCodeVerifier()
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCAuthenticationFailed,
			Message: exception.OIDCAuthenticationFailedMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		})
		return
	}
	codeChallenge := o.generateCodeChallenge(codeVerifier)

	//state parameter is required to prevent CSRF attacks during the authentication flow.
	o.setCallbackCookie(w, "oidc_state_"+o.config.Id, state)
	//nonce parameter is required to prevent replay attacks.
	o.setCallbackCookie(w, "oidc_nonce_"+o.config.Id, nonce)
	//PKCE (Proof Key for Code Exchange) code verifier is used with the code challenge to secure the authorization code exchange process.
	o.setCallbackCookie(w, "oidc_code_verifier_"+o.config.Id, codeVerifier)
	o.setCallbackCookie(w, "oidc_redirect_"+o.config.Id, redirectUrlStr)

	authURL := o.oAuth2Config.AuthCodeURL(
		state,
		oidc.Nonce(nonce),
		oauth2.SetAuthURLParam("code_challenge", codeChallenge),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
	)
	http.Redirect(w, r, authURL, http.StatusFound)
}

func (o oidcProvider) CallbackHandler(w http.ResponseWriter, r *http.Request) {
	stateCookie, err := r.Cookie("oidc_state_" + o.config.Id)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCCallbackFailed,
			Message: exception.OIDCCallbackFailedMsg,
			Params:  map[string]interface{}{"error": "state cookie not found: " + err.Error()},
		})
		return
	}
	if r.URL.Query().Get("state") != stateCookie.Value {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCCallbackFailed,
			Message: exception.OIDCCallbackFailedMsg,
			Params:  map[string]interface{}{"error": "invalid state parameter"},
		})
		return
	}

	nonceCookie, err := r.Cookie("oidc_nonce_" + o.config.Id)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCCallbackFailed,
			Message: exception.OIDCCallbackFailedMsg,
			Params:  map[string]interface{}{"error": "nonce cookie not found: " + err.Error()},
		})
		return
	}

	codeVerifierCookie, err := r.Cookie("oidc_code_verifier_" + o.config.Id)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCCallbackFailed,
			Message: exception.OIDCCallbackFailedMsg,
			Params:  map[string]interface{}{"error": "code verifier cookie not found: " + err.Error()},
		})
		return
	}
	codeVerifier := codeVerifierCookie.Value

	redirectURI := "/"
	if redirectCookie, err := r.Cookie("oidc_redirect_" + o.config.Id); err == nil {
		redirectURI = redirectCookie.Value
	} else {
		log.Warnf("Redirect cookie not found, using default: %v", err)
	}

	utils.DeleteCookie(w, "oidc_state_"+o.config.Id, o.config.OIDCConfiguration.RedirectPath, o.productionMode)
	utils.DeleteCookie(w, "oidc_nonce_"+o.config.Id, o.config.OIDCConfiguration.RedirectPath, o.productionMode)
	utils.DeleteCookie(w, "oidc_code_verifier_"+o.config.Id, o.config.OIDCConfiguration.RedirectPath, o.productionMode)
	utils.DeleteCookie(w, "oidc_redirect_"+o.config.Id, o.config.OIDCConfiguration.RedirectPath, o.productionMode)

	oauth2Token, err := o.oAuth2Config.Exchange(r.Context(), r.URL.Query().Get("code"), oauth2.VerifierOption(codeVerifier))
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCTokenProcessingFailed,
			Message: exception.OIDCTokenProcessingFailedMsg,
			Params:  map[string]interface{}{"error": "failed to exchange token: " + err.Error()},
		})
		return
	}

	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCTokenProcessingFailed,
			Message: exception.OIDCTokenProcessingFailedMsg,
			Params:  map[string]interface{}{"error": "no id_token in OAuth2 token response "},
		})
		return
	}

	idToken, err := o.verifier.Verify(r.Context(), rawIDToken)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCTokenProcessingFailed,
			Message: exception.OIDCTokenProcessingFailedMsg,
			Params:  map[string]interface{}{"error": "failed to verify ID token: " + err.Error()},
		})
		return
	}

	if idToken.Nonce != nonceCookie.Value {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCTokenProcessingFailed,
			Message: exception.OIDCTokenProcessingFailedMsg,
			Params:  map[string]interface{}{"error": "nonce mismatch"},
		})
		return
	}

	var claims idp.OIDCClaims
	if err := idToken.Claims(&claims); err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCTokenProcessingFailed,
			Message: exception.OIDCTokenProcessingFailedMsg,
			Params:  map[string]interface{}{"reason": "failed to parse claims: " + err.Error()},
		})
		return
	}

	if claims.UserId == "" {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCUserProcessingFailed,
			Message: exception.OIDCUserProcessingFailedMsg,
			Params:  map[string]interface{}{"error": "user ID is missing in OIDC claims"},
		})

		return
	}
	if claims.Email == "" {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.OIDCUserProcessingFailed,
			Message: exception.OIDCUserProcessingFailedMsg,
			Params:  map[string]interface{}{"error": "email is missing in OIDC claims"},
		})
		return
	}

	oidcUser := view.User{
		Id:    claims.UserId,
		Name:  claims.Name,
		Email: claims.Email,
	}

	avatarData := []byte(nil)
	// first try to get avatar using the URL from ID token picture claim
	if claims.Picture != "" {
		avatarData = o.downloadAvatar(r.Context(), claims.Picture, oauth2Token)
	}
	// if that fails, try to get it using the URL from UserInfo endpoint response
	if avatarData == nil && o.provider.UserInfoEndpoint() != "" {
		userInfo, err := o.provider.UserInfo(r.Context(), oauth2.StaticTokenSource(oauth2Token))
		if err != nil {
			log.Warnf("Failed to fetch UserInfo for avatar: %v", err)
		} else {
			var userInfoClaims idp.OIDCClaims
			if err := userInfo.Claims(&userInfoClaims); err != nil {
				log.Warnf("Failed to parse claims from UserInfo: %v", err)
			} else if userInfoClaims.Picture != "" && userInfoClaims.Picture != claims.Picture {
				avatarData = o.downloadAvatar(r.Context(), userInfoClaims.Picture, oauth2Token)
			}

		}
	}

	if avatarData != nil {
		oidcUser.AvatarUrl = fmt.Sprintf("/api/v2/users/%s/profile/avatar", oidcUser.Id)
		err = o.userService.StoreUserAvatar(oidcUser.Id, avatarData)
		if err != nil {
			log.Warnf("Failed to store user avatar: %v", err)
		}
	}

	user, err := o.userService.GetOrCreateUserForIntegration(oidcUser, view.ExternalIdpIntegration, o.config.Id)
	if err != nil {
		utils.RespondWithError(w, "Failed to create user for OIDC integration", err)
		return
	}

	// Add authentication cookies
	if err = security.SetAuthTokenCookies(w, user, fmt.Sprintf(SSOLoginRefreshPathTemplate, o.config.Id)); err != nil {
		utils.RespondWithError(w, "Failed to set auth cookie", err)
		return
	}

	// Redirect to the original destination
	http.Redirect(w, r, redirectURI, http.StatusFound)
}

func (o oidcProvider) ServeMetadata(w http.ResponseWriter, r *http.Request) {
	utils.RespondWithError(w, "Not implemented", errors.New("not implemented"))
}

func (o oidcProvider) generateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate state: %w", err)
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func (o oidcProvider) generateNonce() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func (o oidcProvider) generateCodeVerifier() (string, error) {
	b := make([]byte, 64)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate code verifier: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func (o oidcProvider) generateCodeChallenge(verifier string) string {
	h := sha256.New()
	h.Write([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
}

func (o oidcProvider) setCallbackCookie(w http.ResponseWriter, name, value string) {
	c := &http.Cookie{
		Name:     name,
		Value:    value,
		MaxAge:   int(time.Hour.Seconds()),
		Secure:   o.productionMode,
		HttpOnly: true,
		Path:     o.config.OIDCConfiguration.RedirectPath,
	}
	http.SetCookie(w, c)
}

func (o oidcProvider) downloadAvatar(ctx context.Context, avatarURL string, token *oauth2.Token) []byte {
	if avatarURL == "" {
		return nil
	}

	parsedURL, err := url.Parse(avatarURL)
	if err != nil {
		log.Warnf("Failed to parse avatar URL %s: %v", avatarURL, err)
		return nil
	}

	if err := utils.IsHostValid(parsedURL, o.allowedHosts); err != nil {
		log.Warnf("Avatar URL host not allowed: %s", parsedURL.Hostname())
		return nil
	}

	client := makeHttpClient()

	req, err := http.NewRequest(http.MethodGet, avatarURL, nil)
	if err != nil {
		log.Warnf("Failed to create request for avatar URL: %v", err)
		return nil
	}

	if token != nil {
		token.SetAuthHeader(req)
	}

	resp, err := client.Do(req.WithContext(ctx))
	if err != nil {
		log.Warnf("Failed to download avatar from URL %s: %v", avatarURL, err)
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Warnf("Failed to download avatar, received status code %d from URL %s",
			resp.StatusCode, avatarURL)
		return nil
	}

	avatarData, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Warnf("Failed to read avatar data from response: %v", err)
		return nil
	}
	contentType := resp.Header.Get("Content-Type")

	//TODO: rework this if we start supporting not just png
	if contentType != "image/png" {
		log.Warnf("Downloaded avatar is not PNG (content-type: %s). Only PNG is supported.", contentType)
		return nil
	}

	return avatarData
}

func makeHttpClient() *http.Client {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}
	return &cl
}
