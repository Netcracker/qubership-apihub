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

package logging

import (
	"context"
	"net/http"
)

// RequestIDHeader is the HTTP header that carries the request ID.
const RequestIDHeader = "X-Request-Id"

type requestIDKey struct{}

// ContextWithRequestID returns a copy of ctx that carries requestID.
func ContextWithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey{}, requestID)
}

// RequestIDFromContext returns the request ID that ctx carries, or "" when there is none.
func RequestIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	requestID, _ := ctx.Value(requestIDKey{}).(string)
	return requestID
}

// RequestIDMiddleware puts the X-Request-Id header of an incoming request into the request context.
// A log call reports the ID only when it gets that context: log.WithContext(r.Context()).
func RequestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if requestID := r.Header.Get(RequestIDHeader); requestID != "" {
			r = r.WithContext(ContextWithRequestID(r.Context(), requestID))
		}
		next.ServeHTTP(w, r)
	})
}
