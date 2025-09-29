package utils

import (
	"github.com/Netcracker/qubership-api-linter-service/exception"
	"net/http"
	"strconv"
	"strings"
)

func SplitVersionRevision(version string) (string, int, error) {
	if !strings.Contains(version, "@") {
		return version, 0, nil
	}
	versionSplit := strings.Split(version, "@")
	if len(versionSplit) != 2 {
		return "", -1, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidRevisionFormat,
			Message: exception.InvalidRevisionFormatMsg,
			Params:  map[string]interface{}{"version": version},
		}
	}
	versionName := versionSplit[0]
	versionRevisionStr := versionSplit[1]
	versionRevision, err := strconv.Atoi(versionRevisionStr)
	if err != nil {
		return "", -1, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidRevisionFormat,
			Message: exception.InvalidRevisionFormatMsg,
			Params:  map[string]interface{}{"version": version},
			Debug:   err.Error(),
		}
	}
	if versionRevision <= 0 {
		return "", -1, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidRevisionFormat,
			Message: exception.InvalidRevisionFormatMsg,
			Params:  map[string]interface{}{"version": version},
		}
	}
	return versionName, versionRevision, nil
}
