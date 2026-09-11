package utils

import (
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
)

const (
	xForwardedForHeader = "X-Forwarded-For"
)

func DeleteCookie(w http.ResponseWriter, name string, path string, productionMode bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   productionMode,
		Path:     path,
	})
}

func IsHostValid(url *url.URL, allowedHosts []string) *exception.CustomError {
	host := url.Hostname()
	if host == "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.HostNotAllowed,
			Message: exception.HostNotAllowedMsg,
			Params:  map[string]interface{}{"host": "empty host"},
		}
	}
	host = strings.ToLower(host)
	var validHost bool
	for _, allowedHost := range allowedHosts {
		if allowedHost == host {
			validHost = true
			break
		}
		if strings.HasSuffix(host, "."+allowedHost) {
			validHost = true
			break
		}

	}
	if !validHost {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.HostNotAllowed,
			Message: exception.HostNotAllowedMsg,
			Params:  map[string]interface{}{"host": host},
		}
	}
	return nil
}

func RequestorIPFields(r *http.Request) (xForwardedFor string, remoteAddr string) {
	if r == nil {
		return "", ""
	}

	return r.Header.Get(xForwardedForHeader), r.RemoteAddr
}
