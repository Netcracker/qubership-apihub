package responder

import (
	"encoding/json"
	"net/http"

	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	log "github.com/sirupsen/logrus"
)

type Responder struct {
	includeDebug bool
}

func NewResponder(includeDebug bool) *Responder {
	return &Responder{includeDebug: includeDebug}
}

func (resp *Responder) RespondWithCustomError(w http.ResponseWriter, err *exception.CustomError) {
	log.Debugf("Request failed. Code = %d. Message = %s. Params: %v. Debug: %s", err.Status, err.Message, err.Params, err.Debug)
	if !resp.includeDebug && err.Debug != "" {
		errWithoutDebug := *err
		errWithoutDebug.Debug = ""
		resp.RespondWithJson(w, errWithoutDebug.Status, errWithoutDebug)
		return
	}
	resp.RespondWithJson(w, err.Status, err)
}

func (resp *Responder) RespondWithError(w http.ResponseWriter, msg string, err error) {
	if customError, ok := err.(*exception.CustomError); ok {
		logCustomError(msg, customError, err)
		resp.RespondWithCustomError(w, customError)
		return
	}

	log.Errorf("%s: %s", msg, err.Error())
	resp.RespondWithCustomError(w, &exception.CustomError{
		Status:  http.StatusInternalServerError,
		Message: msg,
		Debug:   err.Error(),
	})
}

func (resp *Responder) RespondWithJson(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func logCustomError(msg string, customError *exception.CustomError, err error) {
	if customError.Status == http.StatusNotFound {
		log.Infof("%s: %s", msg, err.Error())
		return
	}
	log.Errorf("%s: %s", msg, err.Error())
}
