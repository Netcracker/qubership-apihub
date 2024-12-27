// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package security

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/controller"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/union"
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
			if multiError, ok := err.(union.MultiError); ok {
				for _, e := range multiError {
					if customError, ok := e.(*exception.CustomError); ok {
						if customError.Status == http.StatusForbidden {
							log.Debugf("Authorization failed(403): %+v", err)
							controller.RespondWithCustomError(w, customError)
							return
						}
					}
				}
			}
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

func SecureJWT(next http.HandlerFunc) http.HandlerFunc {
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
		user, err := jwtStrategy.Authenticate(r.Context(), r)
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

func SecureWebsocket(next http.HandlerFunc) http.HandlerFunc {
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
		token := r.URL.Query().Get("token")
		r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		_, user, err := strategy.AuthenticateRequest(r)
		if err != nil {
			log.Errorf("Authorization failed(401): %+v", err)
			controller.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusUnauthorized,
				Message: http.StatusText(http.StatusUnauthorized),
				Debug:   fmt.Sprintf("%v", err),
			})
			return
		}
		//log.Debugf("User %s Authenticated", user.GetUserName())

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

func SecureAgentProxy(next http.HandlerFunc) http.HandlerFunc {
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
		user, err := customJwtStrategy.Authenticate(r.Context(), r)
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

func SecureProxy(next http.HandlerFunc) http.HandlerFunc {
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
		user, err := customJwtStrategy.Authenticate(r.Context(), r)
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
		r.Header.Del(CustomJwtAuthHeader)
		next.ServeHTTP(w, r)
	}
}
