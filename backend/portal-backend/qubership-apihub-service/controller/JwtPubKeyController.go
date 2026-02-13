package controller

import (
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"net/http"
)

type JwtPubKeyController interface {
	GetRsaPublicKey(w http.ResponseWriter, r *http.Request)
}

func NewJwtPubKeyController() JwtPubKeyController {
	return &jwtPubKeyControllerImpl{}
}

type jwtPubKeyControllerImpl struct {
}

func (t jwtPubKeyControllerImpl) GetRsaPublicKey(w http.ResponseWriter, r *http.Request) {
	key := security.GetPublicKey()
	if key == nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusNotFound,
			Message: "public key not found",
		})
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Write(key)
}
