package utils

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	log "github.com/sirupsen/logrus"
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

func RedirectHandler(apihubURLStr string) http.HandlerFunc {
	apihubURL, _ := url.Parse(apihubURLStr)
	return func(w http.ResponseWriter, r *http.Request) {
		redirectURI := r.URL.Query().Get("redirectUri")
		if redirectURI == "" {
			redirectURI = "/"
		}
		log.Debugf("redirect url - %s", redirectURI)
		redirectUrl, err := url.Parse(redirectURI)
		if err != nil {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectRedirectUrlError,
				Message: exception.IncorrectRedirectUrlErrorMsg,
				Params:  map[string]interface{}{"url": redirectUrl, "error": err.Error()},
			})
			return
		}

		if redirectUrl.Hostname() != apihubURL.Hostname() {
			RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.HostNotAllowed,
				Message: exception.HostNotAllowedMsg,
				Params:  map[string]interface{}{"host": redirectUrl.Hostname()},
			})
			return
		}

		http.Redirect(w, r, redirectURI, http.StatusFound)
	}
}

func RespondWithError(w http.ResponseWriter, msg string, err error) {
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

func RespondWithCustomError(w http.ResponseWriter, err *exception.CustomError) {
	log.Debugf("Request failed. Code = %d. Message = %s. Params: %v. Debug: %s", err.Status, err.Message, err.Params, err.Debug)
	RespondWithJson(w, err.Status, err)
}

func RespondWithJson(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func RequestorIPFields(r *http.Request) (xForwardedFor string, remoteAddr string) {
	if r == nil {
		return "", ""
	}

	return r.Header.Get(xForwardedForHeader), r.RemoteAddr
}
