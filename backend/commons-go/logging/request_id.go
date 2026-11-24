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
