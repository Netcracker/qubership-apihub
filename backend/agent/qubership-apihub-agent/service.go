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
	logFilePath := os.Getenv("LOG_FILE_PATH") //Example: /logs/apihub-agent.log
	var mw io.Writer
	if logFilePath != "" {
		mw = io.MultiWriter(
			os.Stdout,
			&lumberjack.Logger{
				Filename: logFilePath,
				MaxSize:  10, // megabytes
			},
		)
	} else {
		mw = os.Stdout
	}
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

	systemInfoService, err := service.NewSystemInfoService()
	if err != nil {
		log.Error("Failed to read system info: " + err.Error())
		panic("Failed to read system info: " + err.Error())
	}

	apihubClient := client.NewApihubClient(systemInfoService.GetApihubUrl(), systemInfoService.GetAccessToken(), systemInfoService.GetCloudName())
	agentsBackendClient := client.NewAgentsBackendClient(systemInfoService.GetApihubUrl(), systemInfoService.GetAccessToken())

	disablingSerivce := service.NewDisablingService()
	namespaceListCache := service.NewNamespaceListCache(systemInfoService.GetCloudName(), paasCl, systemInfoService.GetNamespacesCacheTTL())
	serviceListCache := service.NewServiceListCache(systemInfoService.GetServicesCacheTTL())
	documentsDiscoveryService := service.NewDocumentsDiscoveryService(systemInfoService.GetDiscoveryTimeout())
	discoveryService := service.NewDiscoveryService(systemInfoService.GetCloudName(), systemInfoService.GetAgentNamespace(), systemInfoService.GetApihubUrl(), systemInfoService.GetExcludeLabels(), systemInfoService.GetGroupingLabels(), namespaceListCache, serviceListCache,
		paasCl, documentsDiscoveryService, apihubClient)
	documentService := service.NewDocumentService(serviceListCache, systemInfoService.GetDiscoveryTimeout())
	regService := service.NewRegistrationService(systemInfoService.GetCloudName(), systemInfoService.GetAgentNamespace(), systemInfoService.GetAgentUrl(),
		systemInfoService.GetBackendVersion(), systemInfoService.GetAgentName(), apihubClient, agentsBackendClient, disablingSerivce)
	listService := service.NewListService(systemInfoService.GetCloudName(), systemInfoService.GetAgentNamespace(), systemInfoService.GetExcludeLabels(), systemInfoService.GetGroupingLabels(), paasCl)
	cloudService := service.NewCloudService(discoveryService, serviceListCache, namespaceListCache)
	routesService := service.NewRoutesService(paasCl)

	namespaceController := controller.NewNamespaceController(namespaceListCache)
	serviceController := controller.NewServiceController(serviceListCache, discoveryService, listService)
	documentController := controller.NewDocumentController(documentService)
	serviceProxyController := controller.NewServiceProxyController(discoveryService)
	apiDocsController := controller.NewApiDocsController(basePath)
	cloudController := controller.NewCloudController(cloudService)
	routesController := controller.NewRoutesController(routesService)
	logsController := controller.NewLogsController()

	disablingMiddleware := controller.NewDisabledServicesMiddleware(disablingSerivce)
	r := mux.NewRouter().SkipClean(true).UseEncodedPath()
	r.Use(disablingMiddleware.HandleRequest)
	r.HandleFunc("/api/v1/namespaces", security.Secure(namespaceController.ListNamespaces)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/namespaces/{name}/serviceNames", security.Secure(serviceController.ListServiceNames)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/namespaces/{name}/routes/{routeName}", security.Secure(routesController.GetRouteByName)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/namespaces/{name}/serviceItems", security.Secure(serviceController.ListServiceItems)).Methods(http.MethodGet)

	//deprecated
	r.HandleFunc("/api/v1/namespaces/{name}/services", security.Secure(serviceController.ListServices_deprecated)).Methods(http.MethodGet)
	//deprecated
	r.HandleFunc("/api/v1/namespaces/{name}/discover", security.Secure(serviceController.StartDiscovery)).Methods(http.MethodPost)
	//deprecated
	r.HandleFunc("/api/v1/namespaces/{name}/services/{serviceId}/specs/{fileId}", security.Secure(documentController.GetServiceDocument)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/namespaces/{name}/workspaces/{workspaceId}/services", security.Secure(serviceController.ListServices_deprecated)).Methods(http.MethodGet) //deprecated
	r.HandleFunc("/api/v2/namespaces/{name}/workspaces/{workspaceId}/discover", security.Secure(serviceController.StartDiscovery)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/namespaces/{name}/workspaces/{workspaceId}/services/{serviceId}/specs/{fileId}", security.Secure(documentController.GetServiceDocument)).Methods(http.MethodGet)

	r.HandleFunc("/api/v3/namespaces/{name}/workspaces/{workspaceId}/services", security.Secure(serviceController.ListServices)).Methods(http.MethodGet)

	//deprecated
	r.HandleFunc("/api/v1/discover", security.Secure(cloudController.StartAllDiscovery_deprecated)).Methods(http.MethodPost)
	//deprecated
	r.HandleFunc("/api/v1/services", security.Secure(cloudController.ListAllServices_deprecated)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/workspaces/{workspaceId}/discover", security.Secure(cloudController.StartAllDiscovery_deprecated)).Methods(http.MethodPost) //deprecated
	r.HandleFunc("/api/v2/workspaces/{workspaceId}/services", security.Secure(cloudController.ListAllServices_deprecated)).Methods(http.MethodGet)    //deprecated

	r.HandleFunc("/v3/api-docs", apiDocsController.GetSpec).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/debug/logs/setLevel", security.Secure(logsController.SetLogLevel)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/debug/logs/checkLevel", security.Secure(logsController.CheckLogLevel)).Methods(http.MethodGet)

	healthController := controller.NewHealthController()
	healthController.AddStartupCheck(func() bool {
		if stubPm != "" {
			return true
		}
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
		r.PathPrefix(utils.ProxyPathDeprecated).HandlerFunc(serviceProxyController.Proxy) //deprecated
	} else {
		r.PathPrefix(utils.ProxyPathDeprecated).HandlerFunc(security.SecureProxy(serviceProxyController.Proxy)) //deprecated
	}

	r.PathPrefix(utils.ProxyPath).HandlerFunc(security.SecureProxy(serviceProxyController.Proxy))

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
