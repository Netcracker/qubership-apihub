package controller

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
)

func getPageQueryParam(r *http.Request) (int, *exception.CustomError) {
	raw := r.URL.Query().Get("page")
	if raw == "" {
		return 0, nil
	}
	page, err := strconv.Atoi(raw)
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
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"value": page, "param": "page"},
		}
	}
	return page, nil
}

func getBoolQueryParam(r *http.Request, param string) (bool, *exception.CustomError) {
	raw := r.URL.Query().Get(param)
	if raw == "" {
		return false, nil
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return false, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectParamType,
			Message: exception.IncorrectParamTypeMsg,
			Params:  map[string]interface{}{"param": param, "type": "bool"},
			Debug:   err.Error(),
		}
	}
	return value, nil
}

// unescapeVersion reads the version path parameter. The router keeps the encoded path, so a version string
// that needs escaping arrives escaped.
func unescapeVersion(r *http.Request) (string, *exception.CustomError) {
	version, err := getUnescapedStringParam(r, "version")
	if err != nil {
		return "", &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		}
	}
	return version, nil
}

// getListQueryParam reads a repeatable query parameter. Both forms OpenAPI allows for an array in a query
// string are accepted: the parameter repeated, and one parameter holding a comma-separated list.
func getListQueryParam(r *http.Request, param string) []string {
	values := make([]string, 0)
	for _, raw := range r.URL.Query()[param] {
		for _, value := range strings.Split(raw, ",") {
			if trimmed := strings.TrimSpace(value); trimmed != "" {
				values = append(values, trimmed)
			}
		}
	}
	return values
}
