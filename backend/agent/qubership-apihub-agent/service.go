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
	"fmt"
	"io"
	"net/http"
	_ "net/http/pprof"
	"os"
	"runtime/debug"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/exception"

	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/gorilla/handlers"
	"github.com/netcracker/qubership-core-lib-go/v3/configloader"

	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/security"
	"gopkg.in/natefinch/lumberjack.v2"

	"github.com/Netcracker/qubership-apihub-agent/controller"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/gorilla/mux"
	paasService "github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/service"
	log "github.com/sirupsen/logrus"
	prefixed "github.com/x-cray/logrus-prefixed-formatter"
)

func init() {
	basePath := os.Getenv("BASE_PATH")
	if basePath == "" {
		basePath = "."
	}
	mw := io.MultiWriter(os.Stderr, &lumberjack.Logger{
		Filename: basePath + "/logs/apihub_agent.log",
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

func init() {
	sourceParams := configloader.YamlPropertySourceParams{ConfigFilePath: "config.yaml"}
	configloader.Init(configloader.BasePropertySources(sourceParams)...)
}

func main() {
	basePath := os.Getenv("BASE_PATH")
	if basePath == "" {
		basePath = "."
	}

	config := loadAgentConfig()

	var paasCl paasService.PlatformService
	var err error
	stubPm := os.Getenv("STUB_PM")
	if stubPm != "" {
		paasCl = &paasService.MockPlatformService{}
	} else {
		paasCl, err = paasService.NewPlatformClientBuilder().Build() // TODO: not sure if should be sync
		if err != nil {
			panic(fmt.Sprintf("Can't create paas-mediation client: %s", err.Error()))
		}
	}

	apihubClient := client.NewApihubClient(config.ApihubUrl, config.AccessToken, config.CloudName)

	disablingSerivce := service.NewDisablingService()
	namespaceListCache := service.NewNamespaceListCache(config.CloudName, paasCl)
	serviceListCache := service.NewServiceListCache()
	documentsDiscoveryService := service.NewDocumentsDiscoveryService(config.DiscoveryTimeout)
	discoveryService := service.NewDiscoveryService(config.CloudName, config.AgentNamespace, config.ApihubUrl, config.ExcludeLabels, config.GroupingLabels, namespaceListCache, serviceListCache,
		paasCl, documentsDiscoveryService, apihubClient)
	documentService := service.NewDocumentService(serviceListCache, config.DiscoveryTimeout)
	systemInfoService, err := service.NewSystemInfoService()
	regService := service.NewRegistrationService(config.CloudName, config.AgentNamespace, config.AgentUrl,
		systemInfoService.GetBackendVersion(), config.AgentName, apihubClient, disablingSerivce)
	listService := service.NewListService(config.CloudName, config.AgentNamespace, config.ExcludeLabels, config.GroupingLabels, paasCl)
	cloudService := service.NewCloudService(discoveryService, serviceListCache, namespaceListCache)
	routesService := service.NewRoutesService(paasCl)

	namespaceController := controller.NewNamespaceController(namespaceListCache)
	serviceController := controller.NewServiceController(serviceListCache, discoveryService, listService)
	documentController := controller.NewDocumentController(documentService)
	serviceProxyController := controller.NewServiceProxyController(discoveryService)
	apiDocsController := controller.NewApiDocsController(basePath)
	cloudController := controller.NewCloudController(cloudService)
	routesController := controller.NewRoutesController(routesService)

	if err != nil {
		log.Error("Failed to read system info: " + err.Error())
		panic("Failed to read system info: " + err.Error())
	}

	disablingMiddleware := controller.NewDisabledServicesMiddleware(disablingSerivce)
	r := mux.NewRouter().SkipClean(true).UseEncodedPath()
	r.Use(disablingMiddleware.HandleRequest)
	r.HandleFunc("/api/v1/namespaces", security.Secure(namespaceController.ListNamespaces)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/namespaces/{name}/serviceNames", security.Secure(serviceController.ListServiceNames)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/namespaces/{name}/routes/{routeName}", security.Secure(routesController.GetRouteByName)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/namespaces/{name}/serviceItems", security.Secure(serviceController.ListServiceItems)).Methods(http.MethodGet)

	//deprecated
	r.HandleFunc("/api/v1/namespaces/{name}/services", security.Secure(serviceController.ListServices)).Methods(http.MethodGet)
	//deprecated
	r.HandleFunc("/api/v1/namespaces/{name}/discover", security.Secure(serviceController.StartDiscovery)).Methods(http.MethodPost)
	//deprecated
	r.HandleFunc("/api/v1/namespaces/{name}/services/{serviceId}/specs/{fileId}", security.Secure(documentController.GetServiceDocument)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/namespaces/{name}/workspaces/{workspaceId}/services", security.Secure(serviceController.ListServices)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/namespaces/{name}/workspaces/{workspaceId}/discover", security.Secure(serviceController.StartDiscovery)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/namespaces/{name}/workspaces/{workspaceId}/services/{serviceId}/specs/{fileId}", security.Secure(documentController.GetServiceDocument)).Methods(http.MethodGet)

	//deprecated
	r.HandleFunc("/api/v1/discover", security.Secure(cloudController.StartAllDiscovery)).Methods(http.MethodPost)
	//deprecated
	r.HandleFunc("/api/v1/services", security.Secure(cloudController.ListAllServices)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/workspaces/{workspaceId}/discover", security.Secure(cloudController.StartAllDiscovery)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/workspaces/{workspaceId}/services", security.Secure(cloudController.ListAllServices)).Methods(http.MethodGet)

	r.HandleFunc("/v3/api-docs", apiDocsController.GetSpec).Methods(http.MethodGet)

	healthController := controller.NewHealthController()
	healthController.AddStartupCheck(func() bool {
		_, err := namespaceListCache.ListNamespaces()
		if err != nil {
			log.Errorf("Failed to list namespaces: %s", err)
		}
		return err == nil
	}, "list namespaces")
	healthController.RunStartupChecks()
	r.HandleFunc("/live", healthController.HandleLiveRequest).Methods(http.MethodGet)
	r.HandleFunc("/ready", healthController.HandleReadyRequest).Methods(http.MethodGet)
	r.HandleFunc("/startup", healthController.HandleStartupRequest).Methods(http.MethodGet)

	if systemInfoService.GetSystemInfo().InsecureProxy {
		r.PathPrefix(utils.ProxyPath).HandlerFunc(serviceProxyController.Proxy)
	} else {
		r.PathPrefix(utils.ProxyPath).HandlerFunc(security.SecureProxy(serviceProxyController.Proxy))
	}

	knownPathPrefixes := []string{
		"/api/",
		"/v3/",
		"/agents/",
		"/apihub-nc/",
		"/startup/",
		"/ready/",
		"/live/",
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

	err = security.SetupGoGuardian(apihubClient)
	if err != nil {
		log.Fatalf("Failed to setup go guardian: %s", err.Error())
	}
	log.Info("go_guardian was installed")

	regService.RunAgentRegistrationProcess()

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
