package controller

import (
	"net/http"
	"os"

	"github.com/Netcracker/qubership-apihub-test-service/exception"
)

type AsyncapiController interface {
	GetAsyncapiYamlSpec(w http.ResponseWriter, r *http.Request)
	GetAsyncapiJsonSpec(w http.ResponseWriter, r *http.Request)
}

func NewAsyncapiController(basePath string) AsyncapiController {
	return &asyncapiControllerImpl{basePath: basePath}
}

type asyncapiControllerImpl struct {
	basePath string
}

func (o asyncapiControllerImpl) GetAsyncapiYamlSpec(w http.ResponseWriter, r *http.Request) {
	bytes, err := os.ReadFile(o.basePath + "/static/asyncapi.yaml")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.FailedToReadSpecFile,
			Message: exception.FailedToReadSpecFileMsg,
			Debug:   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/x-yaml")
	w.Write(bytes)
}

func (o asyncapiControllerImpl) GetAsyncapiJsonSpec(w http.ResponseWriter, r *http.Request) {
	bytes, err := os.ReadFile(o.basePath + "/static/asyncapi.json")
	if err != nil {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.FailedToReadSpecFile,
			Message: exception.FailedToReadSpecFileMsg,
			Debug:   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(bytes)
}
