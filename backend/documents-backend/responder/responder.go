package responder

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	log "github.com/sirupsen/logrus"
)

type Responder struct {
	includeDebug bool
}

func NewResponder(includeDebug bool) Responder {
	return Responder{includeDebug: includeDebug}
}

// RespondWithError maps err to an HTTP response: a *exception.CustomError is returned as-is, anything else is a 500.
func (resp Responder) RespondWithError(w http.ResponseWriter, r *http.Request, msg string, err error) {
	var customError *exception.CustomError
	if errors.As(err, &customError) {
		if customError.Status == http.StatusNotFound {
			log.Infof("%s: %s", msg, err.Error())
		} else if customError.Status >= 500 {
			log.Errorf("%s: %s", msg, err.Error())
		} else {
			log.Debugf("%s: %s", msg, err.Error())
		}
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

func (resp Responder) RespondWithCustomError(w http.ResponseWriter, err *exception.CustomError) {
	log.Debugf("Request failed. Code = %d. Message = %s. Params: %v. Debug: %s", err.Status, err.Message, err.Params, err.Debug)
	out := *err
	out.Message = resolveMessage(err)
	if !resp.includeDebug {
		out.Debug = ""
	}
	resp.RespondWithJson(w, out.Status, out)
}

func resolveMessage(err *exception.CustomError) string {
	noDebug := *err
	noDebug.Debug = ""
	return noDebug.Error()
}

func (resp Responder) RespondWithJson(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_, _ = w.Write(response)
}
