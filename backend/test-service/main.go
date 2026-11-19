package main

import (
	"io"
	"net/http"
	_ "net/http/pprof"
	"os"
	"path"
	"runtime/debug"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/test-service/controller"
	lumberjack "gopkg.in/natefinch/lumberjack.v2"

	"github.com/Netcracker/qubership-apihub/backend/commons-go/logging"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

func init() {
	basePath := os.Getenv("BASE_PATH")
	if basePath == "" {
		basePath = "."
	}
	mw := io.MultiWriter(os.Stderr, &lumberjack.Logger{
		Filename: basePath + "/logs/apihub_test_service.log",
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
	basePath := os.Getenv("BASE_PATH")
	if basePath == "" {
		basePath = "."
	}

	swaggerConfigController := controller.NewSwaggerConfigController(basePath)
	tryitController := controller.NewTryitController()

	r := mux.NewRouter().SkipClean(true).UseEncodedPath()
	r.Use(logging.RequestIDMiddleware)

	// The APIHUB config lists the documents of static/publication-errors, which the static file server below serves
	r.HandleFunc("/v3/api-docs/apihub-swagger-config", swaggerConfigController.GetCustomSwaggerConfig).Methods(http.MethodGet)

	//for tryit tests
	r.HandleFunc("/api/v2/escaped/{escaped}/text/{text}", tryitController.Get).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/escaped/{escaped}/text/{text}", tryitController.Post).Methods(http.MethodPost)

	debug.SetGCPercent(30)

	fs := http.FileServer(http.Dir(basePath + "/static"))

	r.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			fullPath := basePath + "/static/" + strings.TrimPrefix(path.Clean(r.URL.Path), "/")
			_, err := os.Stat(fullPath)
			if err != nil { // Redirect unknown requests to frontend
				r.URL.Path = "/"
			}
		}
		fs.ServeHTTP(w, r)
	})

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
