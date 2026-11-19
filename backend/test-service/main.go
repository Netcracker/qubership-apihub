package main

import (
	"io"
	"net/http"
	_ "net/http/pprof"
	"os"
	"path/filepath"
	"runtime/debug"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/test-service/controller"
	lumberjack "gopkg.in/natefinch/lumberjack.v2"

	"github.com/Netcracker/qubership-apihub/backend/commons-go/logging"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

func init() {
	logFile := filepath.Join(os.TempDir(), "apihub_test_service.log")
	mw := io.MultiWriter(os.Stderr, &lumberjack.Logger{
		Filename: logFile,
		MaxSize:  10, // megabytes
	})
	log.SetFormatter(logging.NewFormatter())
	logLevel, err := log.ParseLevel(os.Getenv("LOG_LEVEL"))
	if err != nil {
		logLevel = log.InfoLevel
	}
	log.SetLevel(logLevel)
	log.SetOutput(mw)
	logging.RedirectStandardLog()
}

func main() {
	tryitController := controller.NewTryitController()

	r := mux.NewRouter().SkipClean(true).UseEncodedPath()
	r.Use(logging.RequestIDMiddleware)

	//for tryit tests
	r.HandleFunc("/api/v2/escaped/{escaped}/text/{text}", tryitController.Get).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/escaped/{escaped}/text/{text}", tryitController.Post).Methods(http.MethodPost)

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	debug.SetGCPercent(30)

	listenAddr := os.Getenv("LISTEN_ADDRESS")
	if listenAddr == "" {
		listenAddr = ":8080"
	}
	log.Infof("Listen addr = %s", listenAddr)

	var corsOptions []handlers.CORSOption

	corsOptions = append(corsOptions, handlers.AllowedHeaders([]string{"Connection", "Accept-Encoding", "Content-Encoding", "X-Requested-With", "Content-Type", "Authorization"}))

	allowedOrigin := os.Getenv("ORIGIN_ALLOWED")
	if allowedOrigin != "" {
		corsOptions = append(corsOptions, handlers.AllowedOrigins([]string{allowedOrigin}))
	}
	corsOptions = append(corsOptions, handlers.AllowedMethods([]string{"GET", "HEAD", "POST", "PUT", "OPTIONS"}))

	srv := &http.Server{
		Handler:      handlers.CompressHandler(handlers.CORS(corsOptions...)(r)),
		Addr:         listenAddr,
		WriteTimeout: 300 * time.Second,
		ReadTimeout:  30 * time.Second,
	}

	log.Fatalf("Http server returned error: %v", srv.ListenAndServe())
}
