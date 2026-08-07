package controller

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub-agent/exception"
	"github.com/Netcracker/qubership-apihub-agent/view"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

const maxDiscoveryRequestBodySize = 1 << 20 // 1 MiB: the requested services list is otherwise unbounded

func getStringParam(r *http.Request, p string) string {
	params := mux.Vars(r)
	return params[p]
}

func getUnescapedStringParam(r *http.Request, p string) (string, error) {
	params := mux.Vars(r)
	return url.PathUnescape(params[p])
}
func RespondWithCustomError(w http.ResponseWriter, err *exception.CustomError) {
	log.Debugf("Request failed. Code = %d. Message = %s. Params: %v. Debug: %s", err.Status, err.Message, err.Params, err.Debug)
	respondWithJson(w, err.Status, err)
}

func respondWithJson(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func respondWithError(w http.ResponseWriter, msg string, err error) {
	if customError, ok := err.(*exception.CustomError); ok {
		logCustomError(msg, customError, err)
		RespondWithCustomError(w, customError)
		return
	}

	log.Errorf("%s: %s", msg, err.Error())
	RespondWithCustomError(w, &exception.CustomError{
		Status:  http.StatusInternalServerError,
		Message: msg,
		Debug:   err.Error()})
}

func logCustomError(msg string, customError *exception.CustomError, err error) {
	if customError.Status == http.StatusNotFound {
		log.Infof("%s: %s", msg, err.Error())
		return
	}
	log.Errorf("%s: %s", msg, err.Error())
}

func getFailOnErrorQueryParam(r *http.Request) (bool, *exception.CustomError) {
	if r.URL.Query().Get("failOnError") != "" {
		val, err := strconv.ParseBool(r.URL.Query().Get("failOnError"))
		if err != nil {
			return false, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "failOnError", "type": "bool"},
				Debug:   err.Error(),
			}
		}
		return val, nil
	}
	return false, nil
}

func getRequestedServicesQueryParam(r *http.Request) []string {
	value := r.URL.Query().Get("services")
	if value == "" {
		return nil
	}

	requestedServices := make([]string, 0)
	for _, serviceName := range strings.Split(value, ",") {
		if serviceName != "" {
			requestedServices = append(requestedServices, serviceName)
		}
	}
	if len(requestedServices) == 0 {
		return nil
	}
	return requestedServices
}

func getDiscoveryRequestBody(w http.ResponseWriter, r *http.Request) (view.DiscoveryRequest, *exception.CustomError) {
	var req view.DiscoveryRequest
	if r.Body == nil {
		return req, nil
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxDiscoveryRequestBodySize))
	if err != nil {
		return req, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		}
	}
	if len(bytes.TrimSpace(body)) == 0 {
		return req, nil
	}

	if err := json.Unmarshal(body, &req); err != nil {
		return req, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		}
	}

	for _, serviceName := range req.Services {
		if serviceName == "" || strings.TrimSpace(serviceName) != serviceName {
			return req, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidServiceName,
				Message: exception.InvalidServiceNameMsg,
				Params:  map[string]interface{}{"name": serviceName},
			}
		}
	}
	return req, nil
}
