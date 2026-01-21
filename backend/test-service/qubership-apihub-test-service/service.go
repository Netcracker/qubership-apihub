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

	"github.com/Netcracker/qubership-apihub-test-service/controller"
	lumberjack "gopkg.in/natefinch/lumberjack.v2"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
	prefixed "github.com/x-cray/logrus-prefixed-formatter"
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
	log.SetFormatter(&prefixed.TextFormatter{
		DisableColors:   true,
		TimestampFormat: "2006-01-02 15:04:05",
		FullTimestamp:   true,
		ForceFormatting: true,
	})
	logLevel, err := log.ParseLevel(os.Getenv("LOG_LEVEL"))
	if err != nil {
		logLevel = log.InfoLevel
	}
	log.SetLevel(logLevel)
	log.SetOutput(mw)
}

func main() {
	basePath := os.Getenv("BASE_PATH")
	if basePath == "" {
		basePath = "."
	}

	openapiController := controller.NewOpenapiController(basePath)
	graphqlController := controller.NewGraphqlController(basePath)
	swaggerConfigController := controller.NewSwaggerConfigController(basePath)
	asyncapiController := controller.NewAsyncapiController(basePath)
	tryitController := controller.NewTryitController()

	r := mux.NewRouter().SkipClean(true).UseEncodedPath()

	r.HandleFunc("/v3/api-docs", openapiController.GetOpenapiSpec).Methods(http.MethodGet)
	r.HandleFunc("/v3/api-docs/yaml", openapiController.GetOpenapiYamlSpec).Methods(http.MethodGet)
	r.HandleFunc("/v3/api-docs/md", openapiController.GetMdFile).Methods(http.MethodGet)
	r.HandleFunc("/v3/api-docs/json", openapiController.GetJsonSample).Methods(http.MethodGet)
	r.HandleFunc("/v3/api-docs/async", asyncapiController.GetAsyncapiYamlSpec).Methods(http.MethodGet)
	r.HandleFunc("/v3/api-docs/async/json", asyncapiController.GetAsyncapiJsonSpec).Methods(http.MethodGet)
	r.HandleFunc("/graphql", graphqlController.GetGraphqlSpec).Methods(http.MethodGet)
	r.HandleFunc("/api/graphql-server/schema", graphqlController.GetGraphqlIntrospection).Methods(http.MethodPost)

	r.HandleFunc("/v3/api-docs/swagger-config", swaggerConfigController.GetSwaggerConfig).Methods(http.MethodGet)
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
