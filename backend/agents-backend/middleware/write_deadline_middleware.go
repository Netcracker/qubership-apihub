package midldleware

import (
	"net/http"
	"time"

	log "github.com/sirupsen/logrus"
)

// responseWriteDeadline is the maximum time allowed for writing a response to the client.
// Applied per-request via http.ResponseController.SetWriteDeadline, which sets the deadline
// on the underlying net.Conn for the write direction only. Unlike http.Server.WriteTimeout
// (which includes processing time), this deadline starts right before writing the response,
// so it covers only the actual I/O phase.
//
// If the client is slow to read and the TCP send buffer fills up, w.Write() blocks.
// When the deadline expires, the blocked write unblocks and returns an i/o timeout error.
// The client receives whatever bytes were already transmitted, then sees a connection reset.
// The server goroutine is freed when the handler returns.
const responseWriteDeadline = 5 * time.Minute

type deadlineResponseWriter struct {
	http.ResponseWriter
	deadlineSet bool
}

func (w *deadlineResponseWriter) setDeadlineOnce() {
	if w.deadlineSet {
		return
	}
	w.deadlineSet = true
	rc := http.NewResponseController(w.ResponseWriter)
	if err := rc.SetWriteDeadline(time.Now().Add(responseWriteDeadline)); err != nil {
		log.Warnf("Failed to set response write deadline: %v", err)
	}
}

func (w *deadlineResponseWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

func (w *deadlineResponseWriter) WriteHeader(code int) {
	w.setDeadlineOnce()
	w.ResponseWriter.WriteHeader(code)
}

func (w *deadlineResponseWriter) Write(b []byte) (int, error) {
	w.setDeadlineOnce()
	return w.ResponseWriter.Write(b)
}

func (w *deadlineResponseWriter) Flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func WriteDeadlineMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(&deadlineResponseWriter{ResponseWriter: w}, r)
	})
}
