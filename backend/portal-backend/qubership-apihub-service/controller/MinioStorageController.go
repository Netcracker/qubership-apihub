package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type MinioStorageController interface {
	DownloadFilesFromMinioToDatabase(w http.ResponseWriter, r *http.Request)
}

func NewMinioStorageController(minioCreds *view.MinioStorageCreds, minioStorageService service.MinioStorageService, responder responder.Responder) MinioStorageController {
	return &minioStorageControllerImpl{
		minioStorageService: minioStorageService,
		minioCreds:          minioCreds,
		responder:           responder,
	}
}

type minioStorageControllerImpl struct {
	minioStorageService service.MinioStorageService
	minioCreds          *view.MinioStorageCreds
	responder           responder.Responder
}

func (m minioStorageControllerImpl) DownloadFilesFromMinioToDatabase(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges := secctx.IsSysadm(ctx)
	if !sufficientPrivileges {
		m.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}
	if !m.minioCreds.IsActive {
		m.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusMethodNotAllowed,
			Message: "Minio integration is inactive. Please check envs for configuration"})
		return
	}
	m.minioStorageService.DownloadFilesFromBucketToDatabase(ctx)
	w.WriteHeader(http.StatusAccepted)
}
