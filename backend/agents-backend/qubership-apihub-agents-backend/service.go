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
	"context"
	"net/http"
	_ "net/http/pprof"
	"os"
	"runtime/debug"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/controller"
	"github.com/Netcracker/qubership-apihub-agents-backend/db"
	"github.com/Netcracker/qubership-apihub-agents-backend/exception"
	"github.com/Netcracker/qubership-apihub-agents-backend/repository"
	"github.com/Netcracker/qubership-apihub-agents-backend/security"
	exposer "github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer"
	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	"github.com/Netcracker/qubership-apihub-agents-backend/service"
	log "github.com/sirupsen/logrus"
)

func main() {
	systemInfoService, err := service.NewSystemInfoService()
	if err != nil {
		panic(err)
	}

	setLogLevel(systemInfoService.GetLogLevel())

	basePath := systemInfoService.GetBasePath()
	r := mux.NewRouter().SkipClean(true).UseEncodedPath()

	dbCreds := systemInfoService.GetDBCredsFromEnv()
	cp := db.NewConnectionProvider(dbCreds)
	initSrv := makeServer(systemInfoService, r)

	readyChan := make(chan bool)
	migrationPassedChan := make(chan bool)
	initSrvStoppedChan := make(chan bool)

	dbMigrationService, err := service.NewDBMigrationService(cp, systemInfoService)
	if err != nil {
		log.Error("Failed create dbMigrationService: " + err.Error())
		panic("Failed create dbMigrationService: " + err.Error())
	}

	go func(initSrvStoppedChan chan bool) { // Do not use safe async here to enable panic
		log.Debugf("Starting init srv")
		_ = initSrv.ListenAndServe()
		log.Debugf("Init srv closed")
		initSrvStoppedChan <- true
		close(initSrvStoppedChan)
	}(initSrvStoppedChan)

	go func(migrationReadyChan chan bool) { // Do not use safe async here to enable panic
		passed := <-migrationPassedChan
		err := initSrv.Shutdown(context.Background())
		if err != nil {
			log.Fatalf("Failed to shutdown initial server")
		}
		if !passed {
			log.Fatalf("Stopping server since migration failed")
		}
		migrationReadyChan <- true
		close(migrationReadyChan)
		close(migrationPassedChan)
	}(readyChan)

	wg := sync.WaitGroup{}
	wg.Add(1)

	go func() { // Do not use safe async here to enable panic
		defer wg.Done()

		_, _, _, err := dbMigrationService.Migrate(basePath)
		if err != nil {
			log.Error("Failed perform DB migration: " + err.Error())
			time.Sleep(time.Second * 10) // Give a chance to read the unrecoverable error
			panic("Failed perform DB migration: " + err.Error())
		}

		migrationPassedChan <- true
	}()

	wg.Wait()
	_ = <-initSrvStoppedChan // wait for the init srv to stop to avoid multiple servers started race condition
	log.Infof("Migration step passed, continue initialization")

	agentClient := client.NewAgentClient(systemInfoService.GetApihubAccessToken())
	apihubClient := client.NewApihubClient(systemInfoService.GetApihubUrl(), systemInfoService.GetApihubAccessToken())

	err = security.SetupGoGuardian(apihubClient)
	if err != nil {
		log.Fatalf("Failed to setup go guardian: %s", err.Error())
	}
	log.Info("go_guardian is set up")

	agentRepository := repository.NewAgentRepository(cp)
	namespaceSecurityRepository := repository.NewNamespaceSecurityRepository(cp)

	agentService := service.NewAgentService(agentRepository)
	permissionService := service.NewPermissionService(apihubClient)
	discoveryService := service.NewDiscoveryService(agentClient, apihubClient, agentService, permissionService, systemInfoService)
	snapshotService := service.NewSnapshotService(systemInfoService, apihubClient, agentClient)
	apiKeyService := service.NewApiKeyService(apihubClient, service.MinSize, service.DefaultAge)
	userService := service.NewUserService(apihubClient, service.MinSize, service.DefaultAge)
	namespaceSecurityService := service.NewNamespaceSecurityService(agentClient, apihubClient, namespaceSecurityRepository, agentService, snapshotService, apiKeyService, userService, systemInfoService)
	excelService := service.NewExcelService(namespaceSecurityRepository, apihubClient)
	cleanupService := service.NewCleanupService(apihubClient)
	err = cleanupService.CreateSnapshotsCleanupJob(systemInfoService.GetSnapshotsCleanupSchedule(), systemInfoService.GetSnapshotsTTLDays())
	if err != nil {
		log.Warnf("failed to create snapshots cleanup job: %v", err)
	}

	agentController := controller.NewAgentController(agentService, agentClient)
	discoveryController := controller.NewDiscoveryController(discoveryService)
	snapshotsController := controller.NewSnapshotController(snapshotService, agentService)
	specificationsController := controller.NewSpecificationsController(agentClient, agentService)
	namespaceSecurityController := controller.NewNamespaceSecurityController(namespaceSecurityService, excelService)
	agentProxyController := controller.NewAgentProxyController(agentService)

	healthController := controller.NewHealthController(readyChan)

	//TODO: it is necessary to add a new permission for the entire agent’s functionality after adding the ability to extend permissions in qubership-apihub-backend
	r.HandleFunc("/api/v2/agents", security.Secure(agentController.ListAgents)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/agents", security.Secure(agentController.ProcessAgentSignal)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/agents/{id}", security.Secure(agentController.GetAgent)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/agents/{agentId}/namespaces", security.Secure(agentController.GetAgentNamespaces)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/agents/{agentId}/namespaces", security.Secure(agentController.GetAgentNamespaces)).Methods(http.MethodGet) //deprecated
	r.HandleFunc("/api/v2/agents/{agentId}/namespaces/{namespace}/serviceNames", security.Secure(agentController.ListServiceNames)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/agents/{agentId}/namespaces/{namespace}/workspaces/{workspaceId}/discover", security.Secure(discoveryController.StartDiscovery)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/agents/{agentId}/namespaces/{namespace}/workspaces/{workspaceId}/services", security.Secure(discoveryController.ListDiscoveredServices)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/agents/{agentId}/namespaces/{namespace}/workspaces/{workspaceId}/services/{serviceId}/specs/{fileId}", security.Secure(specificationsController.GetServiceSpecification)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/agents/{agentId}/namespaces/{namespace}/workspaces/{workspaceId}/snapshots", security.Secure(snapshotsController.CreateSnapshot)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/agents/{agentId}/namespaces/{namespace}/workspaces/{workspaceId}/snapshots", security.Secure(snapshotsController.ListSnapshots)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/agents/{agentId}/namespaces/{namespace}/workspaces/{workspaceId}/snapshots/{version}", security.Secure(snapshotsController.GetSnapshot)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/security/authCheck", security.Secure(namespaceSecurityController.StartAuthSecurityCheck)).Methods(http.MethodPost)
	r.HandleFunc("/api/v3/security/authCheck", security.Secure(namespaceSecurityController.GetAuthSecurityCheckReports)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/security/authCheck/{processId}/status", security.Secure(namespaceSecurityController.GetAuthSecurityCheckStatus)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/security/authCheck/{processId}/report", security.Secure(namespaceSecurityController.GetAuthSecurityCheckResult)).Methods(http.MethodGet)

	const proxyPath = "/agents/{agentId}/namespaces/{namespace}/services/{serviceId}/proxy/"
	if systemInfoService.InsecureProxyEnabled() {
		r.PathPrefix(proxyPath).HandlerFunc(agentProxyController.Proxy)
	} else {
		r.PathPrefix(proxyPath).HandlerFunc(security.SecureProxy(agentProxyController.Proxy))
	}

	discoveryConfig := config.DiscoveryConfig{
		ScanDirectory: basePath + string(os.PathSeparator) + "api",
	}
	specExposer := exposer.New(discoveryConfig)
	discoveryResult := specExposer.Discover()
	if len(discoveryResult.Errors) > 0 {
		for _, err := range discoveryResult.Errors {
			log.Errorf("Error during API specifications discovery: %v", err)
		}
		panic("Failed to expose API specifications")
	}
	if len(discoveryResult.Warnings) > 0 {
		for _, warning := range discoveryResult.Warnings {
			log.Warnf("Warning during API specifications discovery: %s", warning)
		}
	}
	for _, endpointConfig := range discoveryResult.Endpoints {
		log.Debugf("Registering API specification endpoint with path: %s and spec metadata: %+v", endpointConfig.Path, endpointConfig.SpecMetadata)
		r.HandleFunc(endpointConfig.Path, endpointConfig.Handler).Methods(http.MethodGet)
	}

	r.HandleFunc("/live", healthController.HandleLiveRequest).Methods(http.MethodGet)
	r.HandleFunc("/ready", healthController.HandleReadyRequest).Methods(http.MethodGet)
	r.PathPrefix("/debug/").Handler(http.DefaultServeMux)

	knownPathPrefixes := []string{
		"/api/",
		"/live/",
		"/ready/",
		"/debug/",
	}
	for _, prefix := range knownPathPrefixes {
		//add routing for unknown paths with known path prefixes
		r.PathPrefix(prefix).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Warnf("Requested unknown endpoint: %v %v", r.Method, r.RequestURI)
			controller.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusMisdirectedRequest,
				Message: "Requested unknown endpoint",
			})
		})
	}

	debug.SetGCPercent(30)

	srv := makeServer(systemInfoService, r)

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

func setLogLevel(logLevelStr string) {
	logLevel, err := log.ParseLevel(logLevelStr)
	if err != nil {
		logLevel = log.InfoLevel
	}
	log.SetLevel(logLevel)
}
