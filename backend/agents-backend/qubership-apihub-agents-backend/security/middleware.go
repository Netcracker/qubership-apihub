package security

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/shaj13/go-guardian/v2/auth"
	log "github.com/sirupsen/logrus"
)

func (a *AuthHandler) Secure(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Errorf("Request failed with panic: %v", err)
				log.Tracef("Stacktrace: %v", string(debug.Stack()))
				debug.PrintStack()
				a.responder.RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusInternalServerError,
					Message: http.StatusText(http.StatusInternalServerError),
					Debug:   fmt.Sprintf("%v", err),
				})
				return
			}
		}()
		_, user, err := a.strategy.AuthenticateRequest(r)
		if err != nil {
			log.Debugf("Authorization failed(401): %+v", err)
			a.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusUnauthorized,
				Message: http.StatusText(http.StatusUnauthorized),
				Debug:   fmt.Sprintf("%v", err),
			})
			return
		}

		r = auth.RequestWithUser(user, r)
		next.ServeHTTP(w, r)
	}
}

func (a *AuthHandler) SecureProxy(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Errorf("Request failed with panic: %v", err)
				log.Tracef("Stacktrace: %v", string(debug.Stack()))
				debug.PrintStack()
				a.responder.RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusInternalServerError,
					Message: http.StatusText(http.StatusInternalServerError),
					Debug:   fmt.Sprintf("%v", err),
				})
				return
			}
		}()
		user, err := a.proxyStrategy.Authenticate(r.Context(), r)
		if err != nil {
			log.Debugf("Authorization failed(401): %+v", err)
			a.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusUnauthorized,
				Message: http.StatusText(http.StatusUnauthorized),
				Debug:   fmt.Sprintf("%v", err),
			})
			return
		}
		r = auth.RequestWithUser(user, r)
		next.ServeHTTP(w, r)
	}
}
