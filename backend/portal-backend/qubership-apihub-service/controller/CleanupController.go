package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	log "github.com/sirupsen/logrus"
)

type CleanupController interface {
	ClearTestData(w http.ResponseWriter, r *http.Request)
}

func NewCleanupController(cleanupService cleanup.CleanupService) CleanupController {
	return &cleanupControllerImpl{
		cleanupService: cleanupService,
	}
}

type cleanupControllerImpl struct {
	cleanupService cleanup.CleanupService
}

func (c cleanupControllerImpl) ClearTestData(w http.ResponseWriter, r *http.Request) {
	testId, err := getUnescapedStringParam(r, "testId")
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "testId"},
			Debug:   err.Error(),
		})
		return
	}
	err = c.cleanupService.ClearTestData(testId)
	if err != nil {
		log.Error("Failed to clear test data: ", err.Error())
		if customError, ok := err.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
		} else {
			utils.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusInternalServerError,
				Message: "Failed to clear test data",
				Debug:   err.Error()})
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
