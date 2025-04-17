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
	"net/http"
	"runtime/debug"
	"time"

	"github.com/Netcracker/qubership-api-linter-service/controller"
	"github.com/Netcracker/qubership-api-linter-service/service"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

func main() {
	readyChan := make(chan bool)
	systemInfoService, err := service.NewSystemInfoService()
	if err != nil {
		panic(err)
	}
	validationService := service.NewValidationService()
	validationController := controller.NewValidationController(validationService)
	rulesetController := controller.NewRulesetController()
	healthController := controller.NewHealthController(readyChan)

	router := mux.NewRouter()
	router.HandleFunc("/api/validate", validationController.ValidateAPI).Methods(http.MethodPost)
	router.HandleFunc("/ruleset", rulesetController.GetRulesetFile).Methods(http.MethodGet)
	router.HandleFunc("/rulesetjs", rulesetController.GetJSRulesetFile).Methods(http.MethodGet)
	router.HandleFunc("/rulesetjson", rulesetController.GetJsonRulesetFile).Methods(http.MethodGet)

	router.HandleFunc("/live", healthController.HandleLiveRequest).Methods(http.MethodGet)
	router.HandleFunc("/ready", healthController.HandleReadyRequest).Methods(http.MethodGet)
	readyChan <- true
	close(readyChan)

	debug.SetGCPercent(30)

	srv := makeServer(systemInfoService, router)
	log.Fatalf("%v", srv.ListenAndServe())
}

func makeServer(systemInfoService service.SystemInfoService, r *mux.Router) *http.Server {
	listenAddr := systemInfoService.GetListenAddress()

	log.Infof("Listen addr = %s", listenAddr)

	var corsOptions []handlers.CORSOption

	corsOptions = append(corsOptions, handlers.AllowedHeaders([]string{"Connection", "Accept-Encoding", "Content-Encoding", "X-Requested-With", "Content-Type", "Authorization"}))

	allowedOrigin := systemInfoService.GetOriginAllowed()
	if allowedOrigin != "" {
		corsOptions = append(corsOptions, handlers.AllowedOrigins([]string{allowedOrigin}))
	}
	corsOptions = append(corsOptions, handlers.AllowedMethods([]string{"GET", "HEAD", "POST", "PUT", "OPTIONS"}))

	return &http.Server{
		Handler:      handlers.CompressHandler(handlers.CORS(corsOptions...)(r)),
		Addr:         listenAddr,
		WriteTimeout: 600 * time.Second,
		ReadTimeout:  60 * time.Second,
	}
}
