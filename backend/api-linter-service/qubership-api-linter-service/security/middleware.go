package security

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/Netcracker/qubership-api-linter-service/controller"
	"github.com/Netcracker/qubership-api-linter-service/exception"
	"github.com/shaj13/go-guardian/v2/auth"
	log "github.com/sirupsen/logrus"
)

func Secure(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Errorf("Request failed with panic: %v", err)
				log.Tracef("Stacktrace: %v", string(debug.Stack()))
				debug.PrintStack()
				controller.RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusInternalServerError,
					Message: http.StatusText(http.StatusInternalServerError),
					Debug:   fmt.Sprintf("%v", err),
				})
				return
			}
		}()
		_, user, err := strategy.AuthenticateRequest(r)
		if err != nil {
			log.Debugf("Authorization failed(401): %+v", err)
			controller.RespondWithCustomError(w, &exception.CustomError{
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

func NoSecure(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Errorf("Request failed with panic: %v", err)
				log.Tracef("Stacktrace: %v", string(debug.Stack()))
				debug.PrintStack()
				controller.RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusInternalServerError,
					Message: http.StatusText(http.StatusInternalServerError),
					Debug:   fmt.Sprintf("%v", err),
				})
				return
			}
		}()
		next.ServeHTTP(w, r)
	}
}

// SecureMCP restricts the MCP endpoint to API key authentication only (same pattern as qubership-apihub-backend).
func SecureMCP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Errorf("Request failed with panic: %v", err)
				log.Tracef("Stacktrace: %v", string(debug.Stack()))
				debug.PrintStack()
				controller.RespondWithCustomError(w, &exception.CustomError{
					Status:  http.StatusInternalServerError,
					Message: http.StatusText(http.StatusInternalServerError),
					Debug:   fmt.Sprintf("%v", err),
				})
				return
			}
		}()
		user, err := apiKeyStrategy.Authenticate(r.Context(), r)
		if err != nil {
			log.Tracef("MCP authentication failed: %+v", err)
			controller.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusUnauthorized,
				Message: http.StatusText(http.StatusUnauthorized),
				Debug:   fmt.Sprintf("%v", err),
			})
			return
		}

		r = auth.RequestWithUser(user, r)
		next.ServeHTTP(w, r)
	})
}
