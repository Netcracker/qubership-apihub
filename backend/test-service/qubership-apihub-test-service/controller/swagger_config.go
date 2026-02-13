package controller

import (
	"net/http"
	"os"

	"github.com/Netcracker/qubership-apihub-test-service/exception"
)

type SwaggerConfigController interface {
	GetSwaggerConfig(w http.ResponseWriter, r *http.Request)
	GetCustomSwaggerConfig(w http.ResponseWriter, r *http.Request)
}

func NewSwaggerConfigController(basePath string) SwaggerConfigController {
	return &swaggerConfigControllerImpl{basePath: basePath}
}

type swaggerConfigControllerImpl struct {
	basePath string
}

func (s swaggerConfigControllerImpl) GetCustomSwaggerConfig(w http.ResponseWriter, r *http.Request) {
	bytes, err := os.ReadFile(s.basePath + "/static/custom_swagger_config.json")
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

func (s swaggerConfigControllerImpl) GetSwaggerConfig(w http.ResponseWriter, r *http.Request) {
	bytes, err := os.ReadFile(s.basePath + "/static/swagger_config.json")
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
