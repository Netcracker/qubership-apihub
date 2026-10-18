package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security"
)

type JwtPubKeyController interface {
	GetRsaPublicKey(w http.ResponseWriter, r *http.Request)
}

func NewJwtPubKeyController(responder responder.Responder, authenticator security.Authenticator) JwtPubKeyController {
	return &jwtPubKeyControllerImpl{responder: responder, authenticator: authenticator}
}

type jwtPubKeyControllerImpl struct {
	responder     responder.Responder
	authenticator security.Authenticator
}

func (t jwtPubKeyControllerImpl) GetRsaPublicKey(w http.ResponseWriter, r *http.Request) {
	key := t.authenticator.GetPublicKey()
	if key == nil {
		t.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Message: "public key not found",
		})
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Write(key)
}
