package controller

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security/idp"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
	"net/http"
)

type AuthController interface {
	SAMLAssertionConsumerHandler(w http.ResponseWriter, r *http.Request)
	StartAuthentication(w http.ResponseWriter, r *http.Request)
	ServeMetadata(w http.ResponseWriter, r *http.Request)
	OIDCCallbackHandler(w http.ResponseWriter, r *http.Request)
	GetSystemConfigurationInfo(w http.ResponseWriter, r *http.Request)
}

func NewAuthController(systemInfoService service.SystemInfoService, idpManager idp.Manager) AuthController {
	return &authControllerImpl{
		idpManager:        idpManager,
		systemInfoService: systemInfoService,
	}
}

type authControllerImpl struct {
	idpManager        idp.Manager
	systemInfoService service.SystemInfoService
}

func (a *authControllerImpl) ServeMetadata(w http.ResponseWriter, r *http.Request) {
	idpId := getStringParam(r, "idpId")
	provider, exists := a.idpManager.GetProvider(idpId)
	if exists {
		provider.ServeMetadata(w, r)
	} else {
		log.Debugf("Cannot find IDP with id: %s", idpId)
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ExternalIDPNotFound,
			Message: exception.ExternalIDPNotFoundMsg,
			Params:  map[string]interface{}{"id": idpId},
		})
	}
}

// StartAuthentication Frontend calls this endpoint to SSO login user via SAML
func (a *authControllerImpl) StartAuthentication(w http.ResponseWriter, r *http.Request) {
	idpId := getStringParam(r, "idpId")
	provider, exists := a.idpManager.GetProvider(idpId)
	if exists {
		provider.StartAuthentication(w, r)
	} else {
		log.Debugf("Cannot find IDP with id: %s", idpId)
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ExternalIDPNotFound,
			Message: exception.ExternalIDPNotFoundMsg,
			Params:  map[string]interface{}{"id": idpId},
		})
	}
}

// AssertionConsumerHandler This endpoint is called by ADFS when auth procedure is complete on it's side. ADFS posts the response here.
func (a *authControllerImpl) SAMLAssertionConsumerHandler(w http.ResponseWriter, r *http.Request) {
	idpId := getStringParam(r, "idpId")
	provider, exists := a.idpManager.GetProvider(idpId)
	if exists {
		provider.CallbackHandler(w, r)
	} else {
		log.Debugf("Cannot find IDP with id: %s", idpId)
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ExternalIDPNotFound,
			Message: exception.ExternalIDPNotFoundMsg,
			Params:  map[string]interface{}{"id": idpId},
		})
	}
}

func (a *authControllerImpl) OIDCCallbackHandler(w http.ResponseWriter, r *http.Request) {
	idpId := getStringParam(r, "idpId")
	provider, exists := a.idpManager.GetProvider(idpId)
	if exists {
		provider.CallbackHandler(w, r)
	} else {
		log.Debugf("Cannot find IDP with id: %s", idpId)
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.ExternalIDPNotFound,
			Message: exception.ExternalIDPNotFoundMsg,
			Params:  map[string]interface{}{"id": idpId},
		})
	}
}

func (a *authControllerImpl) GetSystemConfigurationInfo(w http.ResponseWriter, r *http.Request) {
	utils.RespondWithJson(w, http.StatusOK,
		view.SystemConfigurationInfo{
			DefaultWorkspaceId: a.systemInfoService.GetDefaultWorkspaceId(),
			AuthConfig:         a.systemInfoService.GetAuthConfig(),
			Extensions:         a.systemInfoService.GetExtensions(),
		})
}
