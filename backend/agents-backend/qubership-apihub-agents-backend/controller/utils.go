package controller

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"

	"github.com/gorilla/mux"

	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
)

const maxDiscoveryRequestBodySize = 1 << 20 // 1 MiB: the requested services list is otherwise unbounded

func getStringParam(r *http.Request, p string) string {
	params := mux.Vars(r)
	return params[p]
}

func getUnescapedStringParam(r *http.Request, p string) (string, error) {
	params := mux.Vars(r)
	return url.QueryUnescape(params[p])
}

func getLimitQueryParam(r *http.Request) (int, *exception.CustomError) {
	defaultLimit := 100
	maxLimit := 100
	if r.URL.Query().Get("limit") != "" {
		limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
		if err != nil {
			return 0, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "limit", "type": "int"},
				Debug:   err.Error(),
			}
		}
		if limit < 1 || limit > maxLimit {
			return 0, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidLimitMsg,
				Params:  map[string]interface{}{"value": limit, "maxLimit": maxLimit},
			}
		}
		return limit, nil
	}
	return defaultLimit, nil
}

func getPageQueryParam(r *http.Request) (int, *exception.CustomError) {
	defaultPage := 0
	if r.URL.Query().Get("page") != "" {
		page, err := strconv.Atoi(r.URL.Query().Get("page"))
		if err != nil {
			return 0, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectParamType,
				Message: exception.IncorrectParamTypeMsg,
				Params:  map[string]interface{}{"param": "page", "type": "int"},
				Debug:   err.Error(),
			}
		}
		if page < 0 {
			return 0, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameter,
				Message: exception.InvalidPageMsg,
				Params:  map[string]interface{}{"value": page},
			}
		}
		return page, nil
	}
	return defaultPage, nil
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

func getDiscoveryRequestBody(w http.ResponseWriter, r *http.Request) (view.DiscoveryRequest, *exception.CustomError) {
	var req view.DiscoveryRequest
	if r.Body == nil {
		return req, nil
	}
	defer r.Body.Close()

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
	return req, nil
}
