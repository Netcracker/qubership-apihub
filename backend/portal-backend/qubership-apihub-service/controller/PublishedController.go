package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	log "github.com/sirupsen/logrus"
)

type PublishedController interface {
	GetVersionSources(w http.ResponseWriter, r *http.Request)
	GetPublishedVersionSourceDataConfig(w http.ResponseWriter, r *http.Request)
	GetPublishedVersionBuildConfig(w http.ResponseWriter, r *http.Request)
}

func NewPublishedController(versionService service.PublishedService, portalService service.PortalService) PublishedController {
	return &publishControllerImpl{
		publishedService: versionService,
		portalService:    portalService,
	}
}

type publishControllerImpl struct {
	publishedService service.PublishedService
	portalService    service.PortalService
}

func (v publishControllerImpl) GetVersionSources(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	srcArchive, err := v.publishedService.GetVersionSources(packageId, versionName)
	if err != nil {
		log.Error("Failed to get package version sources: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
		} else {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get package version sources",
				Debug:   err.Error()})
		}
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.WriteHeader(http.StatusOK)
	w.Write(srcArchive)
}

func (v publishControllerImpl) GetPublishedVersionSourceDataConfig(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	publishedVersionSourceDataConfig, err := v.publishedService.GetPublishedVersionSourceDataConfig(packageId, versionName)
	if err != nil {
		log.Error("Failed to get package version sources: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
		} else {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get package version sources",
				Debug:   err.Error()})
		}
		return
	}

	utils.RespondWithJson(w, http.StatusOK, publishedVersionSourceDataConfig)
}

func (v publishControllerImpl) GetPublishedVersionBuildConfig(w http.ResponseWriter, r *http.Request) {
	packageId := getStringParam(r, "packageId")
	versionName, err := getUnescapedStringParam(r, "version")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}

	publishedVersionBuildConfig, err := v.publishedService.GetPublishedVersionBuildConfig(packageId, versionName)
	if err != nil {
		log.Error("Failed to get package version build config: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
		} else {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to get package version build config",
				Debug:   err.Error()})
		}
		return
	}

	utils.RespondWithJson(w, http.StatusOK, publishedVersionBuildConfig)
}
