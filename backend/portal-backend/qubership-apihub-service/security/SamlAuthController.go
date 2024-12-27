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
	"context"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/controller"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/crewjam/saml"
	"github.com/crewjam/saml/samlsp"
	dsig "github.com/russellhaering/goxmldsig"
	log "github.com/sirupsen/logrus"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type SamlAuthController interface {
	AssertionConsumerHandler(w http.ResponseWriter, r *http.Request)
	StartSamlAuthentication(w http.ResponseWriter, r *http.Request)
	ServeMetadata(w http.ResponseWriter, r *http.Request)
	GetSystemSSOInfo(w http.ResponseWriter, r *http.Request)
}

func NewSamlAuthController(userService service.UserService, systemInfoService service.SystemInfoService) SamlAuthController {
	return &authenticationControllerImpl{
		samlInstance:      createSamlInstance(systemInfoService),
		userService:       userService,
		systemInfoService: systemInfoService,
	}
}

type SamlInstance struct {
	saml  *samlsp.Middleware
	error error
}
type authenticationControllerImpl struct {
	samlInstance      SamlInstance
	userService       service.UserService
	systemInfoService service.SystemInfoService
}

const samlAttributeEmail string = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
const samlAttributeName string = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
const samlAttributeSurname string = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
const samlAttributeUserAvatar string = "thumbnailPhoto"
const samlAttributeUserId string = "User-Principal-Name"

func (a *authenticationControllerImpl) ServeMetadata(w http.ResponseWriter, r *http.Request) {
	if a.samlInstance.error != nil {
		log.Errorf("Cannot serveMetadata with nil samlInstanse")
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.SamlInstanceIsNull,
			Message: exception.SamlInstanceIsNullMsg,
			Params:  map[string]interface{}{"error": a.samlInstance.error.Error()},
		})
		return
	}
	a.samlInstance.saml.ServeMetadata(w, r)
}

// StartSamlAuthentication Frontend calls this endpoint to SSO login user via SAML
func (a *authenticationControllerImpl) StartSamlAuthentication(w http.ResponseWriter, r *http.Request) {
	if a.samlInstance.error != nil {
		log.Errorf("Cannot StartSamlAuthentication with nil samlInstance")
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.SamlInstanceIsNull,
			Message: exception.SamlInstanceIsNullMsg,
			Params:  map[string]interface{}{"error": a.samlInstance.error.Error()},
		})
		return
	}
	redirectUrlStr := r.URL.Query().Get("redirectUri")

	log.Debugf("redirect url - %s", redirectUrlStr)

	redirectUrl, err := url.Parse(redirectUrlStr)
	if err != nil {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectRedirectUrlError,
			Message: exception.IncorrectRedirectUrlErrorMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		})
		return
	}
	var validHost bool
	for _, host := range a.systemInfoService.GetAllowedHosts() {
		if strings.Contains(redirectUrl.Host, host) {
			validHost = true
			break
		}
	}
	if !validHost {
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.HostNotAllowed,
			Message: exception.HostNotAllowedMsg,
			Params:  map[string]interface{}{"host": redirectUrlStr},
		})
		return
	}

	//Current URL is something like /api/v2/auth/saml, and it's a dedicated login endpoint.
	//Frontend detects missing/bad/expired token by 401 response and goes to the endpoint itself with redirectUri as a parameter.
	//But saml library is using middleware logic, i.e. it expects that client is trying to call some business endpoint and checks the security.
	//SAML library stores original URL and after successful auth redirects to it.
	//This is a different flow that we have. Changing r.URL to redirectUrl allows us to adapt to library's middleware flow, it will redirect to expected endpoint automatically.
	r.URL = redirectUrl

	// Note that we do not use built-in session mechanism from saml lib except request tracking cookie
	a.samlInstance.saml.HandleStartAuthFlow(w, r)
}

// AssertionConsumerHandler This endpoint is called by ADFS when auth procedure is complete on it's side. ADFS posts the response here.
func (a *authenticationControllerImpl) AssertionConsumerHandler(w http.ResponseWriter, r *http.Request) {
	if a.samlInstance.error != nil {
		log.Errorf("Cannot run AssertionConsumerHandler with nill samlInstanse")
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.SamlInstanceIsNull,
			Message: exception.SamlInstanceIsNullMsg,
			Params:  map[string]interface{}{"error": a.samlInstance.error.Error()},
		})
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse ACS form: %s", err), http.StatusBadRequest)
		return
	}
	possibleRequestIDs := []string{}
	if a.samlInstance.saml.ServiceProvider.AllowIDPInitiated {
		possibleRequestIDs = append(possibleRequestIDs, "")
	}
	trackedRequests := a.samlInstance.saml.RequestTracker.GetTrackedRequests(r)
	for _, tr := range trackedRequests {
		possibleRequestIDs = append(possibleRequestIDs, tr.SAMLRequestID)
	}
	assertion, err := a.samlInstance.saml.ServiceProvider.ParseResponse(r, possibleRequestIDs)
	if err != nil {
		log.Errorf("Parsing SAML response process error: %s", err.Error())
		var ire *saml.InvalidResponseError
		if errors.As(err, &ire) {
			log.Errorf("Parsing SAML response process private error: %s", ire.PrivateErr.Error())
			log.Debugf("ACS response data: %s", ire.Response)
		}
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.SamlResponseHasParsingError,
			Message: exception.SamlResponseHasParsingErrorMsg,
			Params:  map[string]interface{}{"error": err.Error()},
		})
		return
	}
	if assertion == nil {
		log.Errorf("Assertion from SAML response is nil")
		controller.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.AssertionIsNull,
			Message: exception.AssertionIsNullMsg,
		})
		return
	}

	// Add Apihub auth info cookie
	a.setUserViewCookie(w, assertion)

	// Extract original redirect URI from request tracking cookie
	redirectURI := "/"
	if trackedRequestIndex := r.Form.Get("RelayState"); trackedRequestIndex != "" {
		log.Debugf("trackedRequestIndex = %s", trackedRequestIndex)
		trackedRequest, err := a.samlInstance.saml.RequestTracker.GetTrackedRequest(r, trackedRequestIndex)
		if err != nil {
			if errors.Is(err, http.ErrNoCookie) && a.samlInstance.saml.ServiceProvider.AllowIDPInitiated {
				if uri := r.Form.Get("RelayState"); uri != "" {
					redirectURI = uri
					log.Debugf("redirectURI is found in RelayState and updated to %s", redirectURI)
				}
			}
			controller.RespondWithError(w, "Unable to retrieve redirect URL: failed to get tracked request", err)
			return
		} else {
			err = a.samlInstance.saml.RequestTracker.StopTrackingRequest(w, r, trackedRequestIndex)
			if err != nil {
				log.Warnf("Failed to stop tracking request: %s", err)
				// but it's not a showstopper, so continue processing
			}
			redirectURI = trackedRequest.URI
			log.Debugf("redirectURI is found in trackedRequest and updated to %s", redirectURI)
		}
	}

	http.Redirect(w, r, redirectURI, http.StatusFound)
}

func (a *authenticationControllerImpl) setUserViewCookie(w http.ResponseWriter, assertion *saml.Assertion) {
	assertionAttributes := getAssertionAttributes(assertion)

	userView, err := a.getOrCreateUser(assertionAttributes)
	if err != nil {
		controller.RespondWithError(w, "Failed to get or create SSO user", err)
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
	log.Debugf("Auth user result object: %+v", userView)
}

func getAssertionAttributes(assertion *saml.Assertion) map[string][]string {
	assertionAttributes := make(map[string][]string)
	for _, attributeStatement := range assertion.AttributeStatements {
		for _, attr := range attributeStatement.Attributes {
			claimName := attr.FriendlyName
			if claimName == "" {
				claimName = attr.Name
			}
			for _, value := range attr.Values {
				assertionAttributes[claimName] = append(assertionAttributes[claimName], value.Value)
			}
		}
	}
	return assertionAttributes
}

func (a *authenticationControllerImpl) getOrCreateUser(assertionAttributes map[string][]string) (*UserView, error) {
	samlUser := view.User{}
	if len(assertionAttributes[samlAttributeUserId]) != 0 {
		userLogin := assertionAttributes[samlAttributeUserId][0]
		if strings.Contains(userLogin, "@") {
			samlUser.Id = strings.Split(assertionAttributes[samlAttributeUserId][0], "@")[0]
		} else {
			samlUser.Id = userLogin
		}
		log.Debugf("Attributes from saml response for user %s - %v", samlUser.Id, assertionAttributes)
	} else {
		log.Error("UserId is empty in saml response")
		log.Errorf("Attributes from saml response - %v", assertionAttributes)
		return nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.SamlResponseHaveNoUserId,
			Message: exception.SamlResponseHaveNoUserIdMsg,
		}
	}

	if len(assertionAttributes[samlAttributeName]) != 0 {
		samlUser.Name = assertionAttributes[samlAttributeName][0]
	}
	if len(assertionAttributes[samlAttributeSurname]) != 0 {
		samlUser.Name = fmt.Sprintf("%s %s", samlUser.Name, assertionAttributes[samlAttributeSurname][0])
	}
	if len(assertionAttributes[samlAttributeEmail]) != 0 {
		samlUser.Email = assertionAttributes[samlAttributeEmail][0]
	} else {
		log.Error("Email is empty in saml response")
		log.Errorf("Attributes from saml response - %v", assertionAttributes)
		return nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.SamlResponseMissingEmail,
			Message: exception.SamlResponseMissingEmailMsg,
		}
	}

	if len(assertionAttributes[samlAttributeUserAvatar]) != 0 {
		samlUser.AvatarUrl = fmt.Sprintf("/api/v2/users/%s/profile/avatar", samlUser.Id)
		avatar := assertionAttributes[samlAttributeUserAvatar][0]

		decodedAvatar, err := base64.StdEncoding.DecodeString(avatar)
		if err != nil {
			log.Errorf("Failed to decode user avatar during SSO user login: %s", err)
			return nil, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Code:    exception.SamlResponseHasBrokenContent,
				Message: exception.SamlResponseHasBrokenContentMsg,
				Params:  map[string]interface{}{"userId": samlUser.Id, "error": err.Error()},
				Debug:   "Failed to decode user avatar",
			}
		}
		err = a.userService.StoreUserAvatar(samlUser.Id, decodedAvatar)
		if err != nil {
			return nil, fmt.Errorf("failed to store user avatar: %w", err)
		}
	}

	user, err := a.userService.GetOrCreateUserForIntegration(samlUser, view.ExternalSamlIntegration)
	if err != nil {
		return nil, fmt.Errorf("failed to create user for SSO integration: %w", err)
	}
	userView, err := CreateTokenForUser(*user)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: "Failed to create token for SSO user",
			Debug:   err.Error(),
		}
	}
	return userView, nil
}

func (a *authenticationControllerImpl) GetSystemSSOInfo(w http.ResponseWriter, r *http.Request) {
	controller.RespondWithJson(w, http.StatusOK,
		view.SystemConfigurationInfo{
			SSOIntegrationEnabled: a.samlInstance.error == nil,
			AutoRedirect:          a.samlInstance.error == nil,
			DefaultWorkspaceId:    a.systemInfoService.GetDefaultWorkspaceId(),
		})
}

func createSamlInstance(systemInfoService service.SystemInfoService) SamlInstance {
	var samlInstance SamlInstance
	var err error
	crt, err := os.CreateTemp("", "apihub.cert")
	if err != nil {
		log.Errorf("Apihub.cert temp file wasn't created. Error - %s", err.Error())
		samlInstance.error = err
		return samlInstance
	}
	decodeSamlCert, err := base64.StdEncoding.DecodeString(systemInfoService.GetSamlCrt())
	if err != nil {
		samlInstance.error = err
		return samlInstance
	}

	_, err = crt.WriteString(string(decodeSamlCert))

	if err != nil {
		log.Errorf("SAML_CRT error - %s", err)
		samlInstance.error = err
		return samlInstance
	}

	key, err := os.CreateTemp("", "apihub.key")
	if err != nil {
		log.Errorf("Apihub.key temp file wasn't created. Error - %s", err.Error())
		samlInstance.error = err
		return samlInstance
	}
	decodePrivateKey, err := base64.StdEncoding.DecodeString(systemInfoService.GetSamlKey())
	if err != nil {
		samlInstance.error = err
		return samlInstance
	}

	_, err = key.WriteString(string(decodePrivateKey))

	if err != nil {
		log.Errorf("SAML_KEY error - %s", err)
		samlInstance.error = err
		return samlInstance
	}

	defer key.Close()
	defer crt.Close()
	defer os.Remove(key.Name())
	defer os.Remove(crt.Name())

	keyPair, err := tls.LoadX509KeyPair(crt.Name(), key.Name())
	if err != nil {
		log.Errorf("keyPair error - %s", err)
		samlInstance.error = err
		return samlInstance
	}

	keyPair.Leaf, err = x509.ParseCertificate(keyPair.Certificate[0])
	if err != nil {
		log.Errorf("keyPair.Leaf error - %s", err)
		samlInstance.error = err
		return samlInstance
	}
	metadataUrl := systemInfoService.GetADFSMetadataUrl()
	if metadataUrl == "" {
		log.Error("metadataUrl env is empty")
		samlInstance.error = err
		return samlInstance
	}
	idpMetadataURL, err := url.Parse(metadataUrl)
	if err != nil {
		log.Errorf("idpMetadataURL error - %s", err)
		samlInstance.error = err
		return samlInstance
	}

	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}
	idpMetadata, err := samlsp.FetchMetadata(context.Background(), &cl, *idpMetadataURL)

	if err != nil {
		log.Errorf("idpMetadata error - %s", err)
		samlInstance.error = err
		return samlInstance
	}
	rootURLPath := systemInfoService.GetAPIHubUrl()
	if rootURLPath == "" {
		log.Error("rootURLPath env is empty")
		samlInstance.error = err
		return samlInstance
	}
	rootURL, err := url.Parse(rootURLPath)
	if err != nil {
		log.Errorf("rootURL error - %s", err)
		samlInstance.error = err
		return samlInstance
	}

	samlSP, err := samlsp.New(samlsp.Options{
		URL:         *rootURL,
		Key:         keyPair.PrivateKey.(*rsa.PrivateKey),
		Certificate: keyPair.Leaf,
		IDPMetadata: idpMetadata,
		EntityID:    rootURL.Path,
	})
	if err != nil {
		log.Errorf("New saml instanse wasn't created. Error -%s", err.Error())
		samlInstance.error = err
		return samlInstance
	}

	samlSP.ServiceProvider.SignatureMethod = dsig.RSASHA256SignatureMethod
	samlSP.ServiceProvider.AuthnNameIDFormat = saml.TransientNameIDFormat
	samlSP.ServiceProvider.AllowIDPInitiated = true
	log.Infof("SAML instance initialized")
	samlInstance.saml = samlSP
	return samlInstance
}
