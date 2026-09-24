package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup"
)

type CleanupController interface {
	ClearTestData(w http.ResponseWriter, r *http.Request)
}

func NewCleanupController(cleanupService cleanup.CleanupService, responder responder.Responder) CleanupController {
	return &cleanupControllerImpl{
		cleanupService: cleanupService,
		responder:      responder,
	}
}

type cleanupControllerImpl struct {
	cleanupService cleanup.CleanupService
	responder      responder.Responder
}

func (c cleanupControllerImpl) ClearTestData(w http.ResponseWriter, r *http.Request) {
	testId, err := getUnescapedStringParam(r, "testId")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "testId"},
			Debug:   err.Error(),
		})
		return
	}
	testEnv := r.URL.Query().Get("testEnv")
	err = c.cleanupService.ClearTestData(r.Context(), testId, testEnv)
	if err != nil {
		c.responder.RespondWithError(w, r, "Failed to clear test data", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
