package controller

import (
	"encoding/json"
	"fmt"

	"io/ioutil"
	"net/http"
	"net/url"

	"github.com/Netcracker/qubership-apihub-test-service/exception"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

func getId(r *http.Request) string {
	params := mux.Vars(r)
	return params["id"]
}

func getStringParam(r *http.Request, p string) string {
	params := mux.Vars(r)
	return params[p]
}

func getUnescapedStringParam(r *http.Request, p string) (string, error) {
	params := mux.Vars(r)
	return url.QueryUnescape(params[p])
}

func getParamsFromBody(r *http.Request) (map[string]interface{}, error) {
	var params map[string]interface{}
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(body, &params); err != nil {
		return nil, err
	}
	return params, nil
}

func getBodyObjectParam(params map[string]interface{}, p string) (map[string]interface{}, error) {
	if params[p] == nil {
		return nil, fmt.Errorf("parameter %v is missing", p)
	}
	if param, ok := params[p].(map[string]interface{}); ok {
		return param, nil
	}
	return nil, fmt.Errorf("parameter %v has incorrect type", p)
}

func getBodyStringParam(params map[string]interface{}, p string) (string, error) {
	if params[p] == nil {
		return "", nil
	}
	if param, ok := params[p].(string); ok {
		return param, nil
	}
	return "", fmt.Errorf("parameter %v is not a string", p)
}

func getBodyBoolParam(params map[string]interface{}, p string) (*bool, error) {
	if params[p] == nil {
		return nil, nil
	}
	if param, ok := params[p].(bool); ok {
		return &param, nil
	}
	return nil, fmt.Errorf("parameter %v is not boolean", p)
}

func getBodyStrArrayParam(params map[string]interface{}, p string) ([]string, error) {
	if params[p] == nil {
		return nil, fmt.Errorf("parameter %v is missing", p)
	}
	if param, ok := params[p].([]interface{}); ok {
		arr := make([]string, 0)
		for _, el := range param {
			if elStr, ok := el.(string); ok {
				arr = append(arr, elStr)
			}
		}
		return arr, nil
	}
	return nil, fmt.Errorf("parameter %v has incorrect type", p)
}
func RespondWithCustomError(w http.ResponseWriter, err *exception.CustomError) {
	log.Debugf("Request failed. Code = %d. Message = %s. Params: %v. Debug: %s", err.Status, err.Message, err.Params, err.Debug)
	respondWithJson(w, err.Status, err)
}

func respondWithError(w http.ResponseWriter, msg string, err error) {
	log.Errorf("%s: %s", msg, err.Error())
	if customError, ok := err.(*exception.CustomError); ok {
		RespondWithCustomError(w, customError)
	} else {
		RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: msg,
			Debug:   err.Error()})
	}
}

func respondWithJson(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
