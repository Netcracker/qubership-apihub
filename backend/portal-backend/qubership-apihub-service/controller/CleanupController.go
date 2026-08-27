package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
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
	err = c.cleanupService.ClearTestData(r.Context(), testId)
	if err != nil {
		utils.RespondWithError(w, r, "Failed to clear test data", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
