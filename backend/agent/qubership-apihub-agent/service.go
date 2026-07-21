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
	midldleware "github.com/Netcracker/qubership-apihub-agent/middleware"
	"github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/types"

	"github.com/Netcracker/qubership-apihub-agent/client"
	"github.com/Netcracker/qubership-apihub-agent/security"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/gorilla/handlers"
	"gopkg.in/natefinch/lumberjack.v2"

	"github.com/Netcracker/qubership-apihub-agent/controller"
	"github.com/Netcracker/qubership-apihub-agent/service"
	"github.com/gorilla/mux"
	paasService "github.com/netcracker/qubership-core-lib-go-paas-mediation-client/v8/service"
	log "github.com/sirupsen/logrus"
	prefixed "github.com/x-cray/logrus-prefixed-formatter"
)

func init() {
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

func main() {
	systemInfoService, err := service.NewSystemInfoService()
	if err != nil {
		log.Error("Failed to read system info: " + err.Error())
		panic("Failed to read system info: " + err.Error())
	}
	if err := utils.ValidateTLSAtStartup(); err != nil {
		log.Fatalf("TLS configuration failed: %v", err)
	}

	var paasCl paasService.PlatformService
	stubPm := os.Getenv("STUB_PM")
	if stubPm != "" {
		paasCl = &paasService.MockPlatformService{}
	} else {
		paasCl, err = paasService.NewPlatformClientBuilder().
			WithNamespace(systemInfoService.GetAgentNamespace()).
			WithPlatformType(types.PlatformType(systemInfoService.GetPaasPlatform())).
			WithConsul(false, "").
			Build() // TODO: not sure if should be sync
		if err != nil {
			panic(fmt.Sprintf("Can't create paas-mediation client: %s", err.Error()))
		}
	}

	apihubClient, err := client.NewApihubClient(systemInfoService.GetApihubUrl(), systemInfoService.GetAccessToken(), systemInfoService.GetCloudName())
	if err != nil {
		panic(fmt.Sprintf("Can't create APIHUB client: %s", err.Error()))
	}
	agentsBackendClient, err := client.NewAgentsBackendClient(systemInfoService.GetApihubUrl(), systemInfoService.GetAccessToken())
	if err != nil {
		panic(fmt.Sprintf("Can't create agents-backend client: %s", err.Error()))
	}

	disablingSerivce := service.NewDisablingService()
	namespaceListCache := service.NewNamespaceListCache(systemInfoService.GetCloudName(), paasCl, systemInfoService.GetNamespacesCacheTTL())
	serviceListCache := service.NewServiceListCache(systemInfoService.GetServicesCacheTTL())
	documentsDiscoveryService := service.NewDocumentsDiscoveryService(systemInfoService.GetDiscoveryTimeout())
	discoveryService := service.NewDiscoveryService(systemInfoService.GetCloudName(), systemInfoService.GetAgentNamespace(), systemInfoService.GetApihubUrl(), systemInfoService.GetExcludeLabels(), systemInfoService.GetGroupingLabels(), namespaceListCache, serviceListCache,
		paasCl, documentsDiscoveryService, apihubClient, systemInfoService.GetDiscoveryUrls())
	documentService := service.NewDocumentService(serviceListCache, systemInfoService.GetDiscoveryTimeout())
	regService := service.NewRegistrationService(systemInfoService.GetCloudName(), systemInfoService.GetAgentNamespace(), systemInfoService.GetAgentUrl(),
		systemInfoService.GetBackendVersion(), systemInfoService.GetAgentName(), apihubClient, agentsBackendClient, disablingSerivce)
	listService := service.NewListService(systemInfoService.GetCloudName(), systemInfoService.GetAgentNamespace(), systemInfoService.GetExcludeLabels(), systemInfoService.GetGroupingLabels(), paasCl)
	cloudService := service.NewCloudService(discoveryService, serviceListCache, namespaceListCache)
	routesService := service.NewRoutesService(paasCl)

	namespaceController := controller.NewNamespaceController(namespaceListCache)
	serviceController := controller.NewServiceController(serviceListCache, discoveryService, listService)
	documentController := controller.NewDocumentController(documentService)
	serviceProxyController, err := controller.NewServiceProxyController(discoveryService)
	if err != nil {
		panic(fmt.Sprintf("Can't create service proxy controller: %s", err.Error()))
	}
	apiDocsController := controller.NewApiDocsController(systemInfoService.GetBasePath())
	cloudController := controller.NewCloudController(cloudService)
	routesController := controller.NewRoutesController(routesService)
	logsController := controller.NewLogsController()

	disablingMiddleware := controller.NewDisabledServicesMiddleware(disablingSerivce)
	r := mux.NewRouter().SkipClean(true).UseEncodedPath()
	r.Use(disablingMiddleware.HandleRequest)
	r.Use(midldleware.WriteDeadlineMiddleware)
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

	if systemInfoService.InsecureProxyEnabled() {
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
			xForwardedFor, remoteAddr := utils.RequestorIPFields(r)
			log.WithFields(log.Fields{
				"method":          r.Method,
				"uri":             r.RequestURI,
				"x_forwarded_for": xForwardedFor,
				"remote_addr":     remoteAddr,
			}).Warn("Requested unknown endpoint")

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

	// ReadTimeout limits the time for the client to send the full request (headers + body).
	// The timer starts when the connection is accepted and applies to the entire read phase:
	//   - During header reading: if headers aren't fully received within the deadline, the
	//     server closes the connection immediately and the handler is never called.
	//   - During body reading (inside handler): the remaining time from the same deadline
	//     applies to r.Body reads. If the deadline expires, r.Body.Read() returns a timeout
	//     error — the connection is NOT dropped automatically, the handler must handle the error.
	//   - For requests with no body (e.g., GET), the body phase is irrelevant.
	// This protects against slow or abandoned connections consuming server resources.
	//
	// WriteTimeout is intentionally NOT set. Go's WriteTimeout starts its timer when request
	// headers are read and covers the entire handler execution plus response writing.
	// This makes it unsuitable for long-running requests: a handler that legitimately processes
	// for 4 minutes would have only 1 minute left for writing (with WriteTimeout=300s).
	// The connection won't be dropped at the timeout mark — it stays open while the handler
	// runs — but the write will immediately fail when the handler finally tries to respond.
	// Instead, we use:
	//   - http.ResponseController.SetWriteDeadline per-request (see middleware/write_deadline_middleware.go) to set
	//     a deadline only on the response writing phase, independent of processing time.
	//   - Context with deadline for processing time control (planned, not yet implemented).
	srv := &http.Server{
		Handler:     handlers.CompressHandler(handlers.CORS(corsOptions...)(r)),
		Addr:        listenAddr,
		ReadTimeout: 60 * time.Second,
	}

	log.Fatalf("Http server returned error: %v", srv.ListenAndServe())
}
