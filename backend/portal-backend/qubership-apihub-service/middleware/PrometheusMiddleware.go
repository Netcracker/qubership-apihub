package midldleware

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/gorilla/mux"
)

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	return &loggingResponseWriter{w, http.StatusOK}
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// TODO: if PrometheusMiddleware is re-enabled, its loggingResponseWriter must implement Unwrap() for SetWriteDeadline to reach the underlying connection
func PrometheusMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()
		statusCode := 200
		now := time.Now()

		if strings.Contains(path, "/ws/") {
			next.ServeHTTP(w, r)
		} else {
			lrw := newLoggingResponseWriter(w)
			next.ServeHTTP(lrw, r)
			statusCode = lrw.statusCode
		}

		elapsedSeconds := time.Since(now).Seconds()

		metrics.TotalRequests.WithLabelValues(path, strconv.Itoa(statusCode), r.Method).Inc()
		metrics.HttpDuration.WithLabelValues(path, strconv.Itoa(statusCode), r.Method).Observe(elapsedSeconds)
	})
}
