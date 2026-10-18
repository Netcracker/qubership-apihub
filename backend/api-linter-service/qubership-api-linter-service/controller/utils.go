package controller

import (
	"net/http"
	"net/url"
	"strconv"

	"github.com/gorilla/mux"

	"github.com/Netcracker/qubership-api-linter-service/exception"
)

func getStringParam(r *http.Request, p string) string {
	params := mux.Vars(r)
	return params[p]
}

func getUnescapedStringParam(r *http.Request, p string) (string, error) {
	params := mux.Vars(r)
	return url.QueryUnescape(params[p])
}

func getLimitQueryParam(r *http.Request) (int, *exception.CustomError) {
	return getLimitQueryParamBase(r, 100, 100)
}

func getLimitQueryParamBase(r *http.Request, defaultLimit, maxLimit int) (int, *exception.CustomError) {
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
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidLimitMsg,
				Params:  map[string]interface{}{"value": limit, "maxLimit": maxLimit},
			}
		}
		return limit, nil
	}
	return defaultLimit, nil
}
