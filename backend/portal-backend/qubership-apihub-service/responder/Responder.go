package responder

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	log "github.com/sirupsen/logrus"
)

type Responder struct {
	includeDebug bool
}

func NewResponder(includeDebug bool) Responder {
	return Responder{includeDebug: includeDebug}
}

func (resp Responder) RedirectHandler(apihubURLStr string) http.HandlerFunc {
	apihubURL, _ := url.Parse(apihubURLStr)
	return func(w http.ResponseWriter, r *http.Request) {
		redirectURI := r.URL.Query().Get("redirectUri")
		if redirectURI == "" {
			redirectURI = "/"
		}
		log.Debugf("redirect url - %s", redirectURI)
		redirectUrl, err := url.Parse(redirectURI)
		if err != nil {
			resp.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.IncorrectRedirectUrlError,
				Message: exception.IncorrectRedirectUrlErrorMsg,
				Params:  map[string]interface{}{"url": redirectUrl, "error": err.Error()},
			})
			return
		}

		if redirectUrl.Hostname() != apihubURL.Hostname() {
			resp.RespondWithCustomError(w, &exception.CustomError{
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

// IsRequestTimeout reports whether err was caused by the request running out of its own deadline
func (resp Responder) IsRequestTimeout(err error) bool {
	return errors.Is(err, context.DeadlineExceeded)
}

func (resp Responder) IsContextCancelled(err error) bool {
	return errors.Is(err, context.Canceled)
}

// IsClientDisconnected reports whether the client went away before the request completed
func (resp Responder) IsClientDisconnected(r *http.Request) bool {
	return r != nil && resp.IsContextCancelled(r.Context().Err())
}

// requestContextError reports the context failure that ended a request, or nil when the request is
// still healthy. The request context is checked first: go-pg answers a query aborted by a deadline
// with SQLSTATE 57014 or an i/o timeout, so the sentinel is usually missing from the error chain.
// The error chain is checked second, which covers deadlines owned by an inner context: credential
// verification and LDAP lookups bound themselves well below the request deadline.
func (resp Responder) requestContextError(r *http.Request, err error) error {
	if r != nil {
		if ctxErr := r.Context().Err(); ctxErr != nil {
			return ctxErr
		}
	}
	if resp.IsRequestTimeout(err) {
		return context.DeadlineExceeded
	}
	if resp.IsContextCancelled(err) {
		return context.Canceled
	}
	return nil
}

func (resp Responder) RespondWithError(w http.ResponseWriter, r *http.Request, msg string, err error) {
	if ctxErr := resp.requestContextError(r, err); ctxErr != nil {
		resp.RespondWithContextError(w, r, msg, ctxErr, err)
		return
	}

	if customError, ok := err.(*exception.CustomError); ok {
		logCustomError(msg, customError, err)
		resp.RespondWithCustomError(w, customError)
		return
	}

	log.Errorf("%s: %s", msg, err.Error())
	resp.RespondWithCustomError(w, &exception.CustomError{
		Status:  http.StatusInternalServerError,
		Message: msg,
		Debug:   err.Error()})
}

// RespondWithContextError reports a request that ended because its context was done: ctxErr tells a
// timeout from a cancellation, cause is the failure the call chain actually returned.
func (resp Responder) RespondWithContextError(w http.ResponseWriter, r *http.Request, msg string, ctxErr error, cause error) {
	// Nobody is left to read a response
	if resp.IsClientDisconnected(r) {
		log.Debugf("%s: client closed the request before it completed: %s", msg, cause.Error())
		return
	}

	// The log has no error code to carry the classification, so it names the context failure itself
	log.Errorf("%s: %s: %s", msg, ctxErr.Error(), cause.Error())

	code, message := exception.RequestCancelled, exception.RequestCancelledMsg
	if resp.IsRequestTimeout(ctxErr) {
		code, message = exception.RequestTimeout, exception.RequestTimeoutMsg
	}
	resp.RespondWithCustomError(w, &exception.CustomError{
		Status:  http.StatusInternalServerError,
		Code:    code,
		Message: message,
		Debug:   cause.Error(),
	})
}

func logCustomError(msg string, customError *exception.CustomError, err error) {
	if customError.Status == http.StatusNotFound {
		log.Infof("%s: %s", msg, err.Error())
		return
	}
	log.Errorf("%s: %s", msg, err.Error())
}

func (resp Responder) RespondWithCustomError(w http.ResponseWriter, err *exception.CustomError) {
	log.Debugf("Request failed. Code = %d. Message = %s. Params: %v. Debug: %s", err.Status, err.Message, err.Params, err.Debug)
	if !resp.includeDebug && err.Debug != "" {
		errWithoutDebug := *err
		errWithoutDebug.Debug = ""
		resp.RespondWithJson(w, errWithoutDebug.Status, errWithoutDebug)
		return
	}
	resp.RespondWithJson(w, err.Status, err)
}

func (resp Responder) RespondWithJson(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
