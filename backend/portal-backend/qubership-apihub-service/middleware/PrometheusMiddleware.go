package midldleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/gorilla/mux"
)

const unknownRoutePathLabel = "unknown"

// metricsResponseWriter records the status code while forwarding Unwrap and Flush,
// so http.ResponseController (write deadlines) and streaming handlers (SSE, MCP) keep working.
type metricsResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newMetricsResponseWriter(w http.ResponseWriter) *metricsResponseWriter {
	return &metricsResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}
}

func (w *metricsResponseWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

func (w *metricsResponseWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *metricsResponseWriter) Flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func PrometheusMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := unknownRoutePathLabel
		if route := mux.CurrentRoute(r); route != nil {
			if template, err := route.GetPathTemplate(); err == nil {
				path = template
			}
		}
		start := time.Now()

		mrw := newMetricsResponseWriter(w)
		next.ServeHTTP(mrw, r)

		elapsedSeconds := time.Since(start).Seconds()
		code := strconv.Itoa(mrw.statusCode)
		metrics.TotalRequests.WithLabelValues(path, code, r.Method).Inc()
		metrics.HttpDuration.WithLabelValues(path, code, r.Method).Observe(elapsedSeconds)
	})
}
