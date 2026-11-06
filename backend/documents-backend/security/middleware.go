package security

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/shaj13/go-guardian/v2/auth"
	log "github.com/sirupsen/logrus"
)

func (a Authenticator) recoverPanic(w http.ResponseWriter) {
	if err := recover(); err != nil {
		log.Errorf("Request failed with panic: %v", err)
		log.Tracef("Stacktrace: %v", string(debug.Stack()))
		a.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Message: http.StatusText(http.StatusInternalServerError),
			Debug:   fmt.Sprintf("%v", err),
		})
	}
}

func (a Authenticator) respondWithAuthFailedError(w http.ResponseWriter, err error) {
	log.Debugf("Authorization failed(401): %+v", err)
	a.responder.RespondWithCustomError(w, &exception.CustomError{
		Status:  http.StatusUnauthorized,
		Code:    exception.Unauthorized,
		Message: exception.UnauthorizedMsg,
		Debug:   fmt.Sprintf("%v", err),
	})
}

// NoSecure runs the handler without authentication.
func (a Authenticator) NoSecure(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer a.recoverPanic(w)
		next.ServeHTTP(w, r)
	}
}

// Secure requires valid credentials; anonymous is never accepted.
func (a Authenticator) Secure(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer a.recoverPanic(w)
		_, user, err := a.fullAuthStrategy.AuthenticateRequest(r)
		if err != nil {
			a.respondWithAuthFailedError(w, err)
			return
		}
		r = auth.RequestWithUser(user, r)
		next.ServeHTTP(w, r)
	}
}

// SecureOrAnonymous behaves as Secure unless APIHUB has anonymous access enabled and the request carries no
// credentials at all; such a request runs as the anonymous principal. Credentials that fail to verify are
// rejected as in Secure and never fall back to anonymous.
func (a Authenticator) SecureOrAnonymous(next http.HandlerFunc) http.HandlerFunc {
	secure := a.Secure(next)
	return func(w http.ResponseWriter, r *http.Request) {
		if hasCredentials(r) {
			secure.ServeHTTP(w, r)
			return
		}
		defer a.recoverPanic(w)
		if !a.anonymousAccess.IsAnonymousAccessEnabled(r.Context()) {
			a.respondWithAuthFailedError(w, fmt.Errorf("no credentials provided and anonymous access is disabled"))
			return
		}
		r = auth.RequestWithUser(anonymousInfo(), r)
		next.ServeHTTP(w, r)
	}
}

func anonymousInfo() auth.Info {
	return auth.NewUserInfo(secctx.AnonymousPrincipalName, "", nil, auth.Extensions{secctx.AnonymousExt: []string{"true"}})
}

// hasCredentials reports whether the request presents any credential the full auth strategy would inspect.
func hasCredentials(r *http.Request) bool {
	if r.Header.Get("Authorization") != "" || r.Header.Get(view.ApiKeyHeader) != "" {
		return true
	}
	if c, err := r.Cookie(view.AccessTokenCookieName); err == nil && c.Value != "" {
		return true
	}
	return false
}
