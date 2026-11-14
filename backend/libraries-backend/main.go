package main

import (
	"context"
	"net/http"
	"os"
	"sync"
	"time"

	exposer "github.com/Netcracker/qubership-apihub/backend/commons-go/api-spec-exposer"
	"github.com/Netcracker/qubership-apihub/backend/commons-go/api-spec-exposer/config"
	"github.com/Netcracker/qubership-apihub/backend/commons-go/logging"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/controller"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/middleware"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/security"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/utils"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"

	_ "net/http/pprof"
)

// migrationFailurePause gives an operator reading the logs a chance to see an unrecoverable migration error
// before the process exits and the container restarts.
const migrationFailurePause = 10 * time.Second

// serverReadTimeout limits the time the client has to send the full request. See the comment in makeServer
// for why no WriteTimeout is set.
const serverReadTimeout = 60 * time.Second

func init() {
	log.SetFormatter(logging.NewFormatter())
	logging.RedirectStandardLog()
	logLevel, err := log.ParseLevel(os.Getenv("LOG_LEVEL"))
	if err != nil {
		logLevel = log.InfoLevel
	}
	log.SetLevel(logLevel)
}

func main() {
	systemInfoService, err := service.NewSystemInfoService()
	if err != nil {
		panic(err)
	}
	resp := responder.NewResponder(systemInfoService.ShowDebugInResponse())
	if err := utils.ValidateTLSAtStartup(); err != nil {
		log.Fatalf("TLS configuration failed: %v", err)
	}

	basePath := systemInfoService.GetBasePath()
	r := mux.NewRouter().SkipClean(true).UseEncodedPath()
	r.Use(logging.RequestIDMiddleware)
	r.Use(middleware.WriteDeadlineMiddleware)

	cp := db.NewConnectionProvider(systemInfoService.GetCreds())
	initSrv := makeServer(systemInfoService, r)

	readyChan := make(chan bool)
	migrationPassedChan := make(chan bool)
	initSrvStoppedChan := make(chan bool)

	dbMigrationService, err := service.NewDBMigrationService(cp, systemInfoService)
	if err != nil {
		log.Fatalf("Failed to create dbMigrationService: %v", err)
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
		if err := initSrv.Shutdown(context.Background()); err != nil {
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

		if _, _, _, err := dbMigrationService.Migrate(basePath); err != nil {
			log.Error("Failed perform DB migration: " + err.Error())
			time.Sleep(migrationFailurePause)
			panic("Failed perform DB migration: " + err.Error())
		}

		migrationPassedChan <- true
	}()

	wg.Wait()
	<-initSrvStoppedChan // wait for the init srv to stop to avoid multiple servers started race condition
	log.Infof("Migration step passed, continue initialization")

	apihubClient, err := client.NewApihubClient(systemInfoService.GetAPIHubUrl(), systemInfoService.GetApihubAccessToken())
	if err != nil {
		log.Fatalf("Failed to create APIHUB client: %v", err)
	}

	utils.SafeAsync(func() {
		systemInfoService.SetProductionMode(apihubClient)
	})

	authenticator, err := security.NewAuthenticator(apihubClient, resp)
	if err != nil {
		log.Fatalf("Failed to setup go guardian: %s", err.Error())
	}
	log.Info("go_guardian is set up")

	registryRepository := repository.NewRegistryRepository(cp)
	libraryRepository := repository.NewLibraryRepository(cp)
	libraryVersionRepository := repository.NewLibraryVersionRepository(cp)
	libraryContentRepository := repository.NewLibraryContentRepository(cp)
	comparisonRepository := repository.NewComparisonRepository(cp)
	buildRepository := repository.NewBuildRepository(cp)
	memberRepository := repository.NewMemberRepository(cp)

	registryService := service.NewRegistryService(registryRepository, systemInfoService)
	// The configured registries have to be in the database before a library can reference one of their
	// repositories, so this runs before the service accepts traffic.
	if err := registryService.SyncFromConfig(secctx.MakeSysadminContext(context.Background())); err != nil {
		log.Fatalf("Failed to synchronise the configured registries: %v", err)
	}

	reportIngestService := service.NewReportIngestService(libraryContentRepository, comparisonRepository)
	buildService := service.NewBuildService(buildRepository, libraryRepository, libraryVersionRepository,
		reportIngestService, systemInfoService)
	authorizationService := service.NewAuthorizationService(apihubClient, memberRepository)
	libraryService := service.NewLibraryService(libraryRepository, memberRepository, registryService)
	registryClient, err := client.NewRegistryClient()
	if err != nil {
		log.Fatalf("Failed to create the registry client: %v", err)
	}
	libraryVersionService := service.NewLibraryVersionService(libraryVersionRepository, buildService, registryService, registryClient)
	changesService := service.NewChangesService(comparisonRepository, libraryVersionRepository)
	memberService := service.NewMemberService(memberRepository, authorizationService, apihubClient)
	searchService := service.NewSearchService(libraryContentRepository)

	registryController := controller.NewRegistryController(registryService, resp)
	libraryController := controller.NewLibraryController(libraryService, authorizationService, resp)
	libraryVersionController := controller.NewLibraryVersionController(libraryVersionService, libraryService, authorizationService, resp)
	changesController := controller.NewChangesController(changesService, libraryService, authorizationService, resp)
	builderController := controller.NewBuilderController(buildService, resp)
	memberController := controller.NewMemberController(memberService, libraryService, authorizationService, resp)
	searchController := controller.NewSearchController(searchService, resp)
	healthController := controller.NewHealthController(readyChan)
	versionController := controller.NewVersionController(service.BackendVersionFromEnv(), resp)
	logsController := controller.NewLogsController(resp)

	// Registries and repositories
	r.HandleFunc("/api/v1/registries", authenticator.Secure(registryController.GetRegistries)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/repositories", authenticator.Secure(registryController.GetRepositories)).Methods(http.MethodGet)

	// Libraries
	r.HandleFunc("/api/v1/libraries", authenticator.Secure(libraryController.GetLibraries)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/libraries", authenticator.Secure(libraryController.PostLibrary)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/libraries/{libraryId}", authenticator.Secure(libraryController.GetLibrary)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/libraries/{libraryId}", authenticator.Secure(libraryController.PatchLibrary)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v1/libraries/{libraryId}", authenticator.Secure(libraryController.DeleteLibrary)).Methods(http.MethodDelete)

	// Versions
	r.HandleFunc("/api/v1/libraries/{libraryId}/versions", authenticator.Secure(libraryVersionController.GetLibraryVersions)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/libraries/{libraryId}/versions", authenticator.Secure(libraryVersionController.PostLibraryVersion)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/libraries/{libraryId}/available-versions", authenticator.Secure(libraryVersionController.GetAvailableVersions)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/libraries/{libraryId}/versions/{version}", authenticator.Secure(libraryVersionController.GetLibraryVersion)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/libraries/{libraryId}/versions/{version}", authenticator.Secure(libraryVersionController.DeleteLibraryVersion)).Methods(http.MethodDelete)

	// Changes
	r.HandleFunc("/api/v1/libraries/{libraryId}/versions/{version}/changes/summary", authenticator.Secure(changesController.GetChangesSummary)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/libraries/{libraryId}/versions/{version}/changes", authenticator.Secure(changesController.GetChanges)).Methods(http.MethodGet)

	// Java build worker loop
	r.HandleFunc("/api/v2/java-builders/{builderId}/tasks", authenticator.Secure(builderController.PollTasks)).Methods(http.MethodPost)
	r.HandleFunc("/api/v3/libraries/{libraryId}/java-publish/{publishId}/status", authenticator.Secure(builderController.PostStatus)).Methods(http.MethodPost)

	// Favorites
	r.HandleFunc("/api/v1/favorites/libraries", authenticator.Secure(libraryController.GetFavoriteLibraries)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/favorites/libraries/{libraryId}", authenticator.Secure(libraryController.PutFavoriteLibrary)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/favorites/libraries/{libraryId}", authenticator.Secure(libraryController.DeleteFavoriteLibrary)).Methods(http.MethodDelete)

	// Members and roles
	r.HandleFunc("/api/v1/libraries/{libraryId}/members", authenticator.Secure(memberController.GetMembers)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/libraries/{libraryId}/members/{userId}", authenticator.Secure(memberController.PutMember)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/libraries/{libraryId}/members/{userId}", authenticator.Secure(memberController.DeleteMember)).Methods(http.MethodDelete)

	// Search
	r.HandleFunc("/api/v1/search/libraries", authenticator.Secure(libraryController.SearchLibraries)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/search/classes", authenticator.Secure(searchController.SearchClasses)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/debug/logs/setLevel", authenticator.Secure(logsController.SetLogLevel)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/debug/logs/checkLevel", authenticator.Secure(logsController.CheckLogLevel)).Methods(http.MethodGet)

	// Service endpoints
	r.HandleFunc("/api/v1/system/version", authenticator.Secure(versionController.GetVersion)).Methods(http.MethodGet)
	r.HandleFunc("/live", healthController.HandleLiveRequest).Methods(http.MethodGet)
	r.HandleFunc("/ready", healthController.HandleReadyRequest).Methods(http.MethodGet)
	r.PathPrefix("/debug/").Handler(http.DefaultServeMux)

	registerApiSpecEndpoints(r, systemInfoService)

	knownPathPrefixes := []string{
		"/api/",
		"/live/",
		"/ready/",
		"/debug/",
	}
	for _, prefix := range knownPathPrefixes {
		// add routing for unknown paths with known path prefixes
		r.PathPrefix(prefix).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			xForwardedFor, remoteAddr := utils.RequestorIPFields(r)
			log.WithFields(log.Fields{
				"method":          r.Method,
				"uri":             r.RequestURI,
				"x_forwarded_for": xForwardedFor,
				"remote_addr":     remoteAddr,
			}).Warn("Requested unknown endpoint")

			resp.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusMisdirectedRequest,
				Message: "Requested unknown endpoint",
			})
		})
	}

	srv := makeServer(systemInfoService, r)

	log.Fatalf("%v", srv.ListenAndServe())
}

func registerApiSpecEndpoints(r *mux.Router, systemInfoService service.SystemInfoService) {
	discoveryConfig := config.DiscoveryConfig{
		ScanDirectory:   systemInfoService.GetApiSpecDir(),
		ExcludePatterns: []string{"*.postman_collection.json"},
	}
	specExposer := exposer.New(discoveryConfig)
	discoveryResult := specExposer.Discover()
	if len(discoveryResult.Errors) > 0 {
		for _, err := range discoveryResult.Errors {
			log.Errorf("Error during API specifications discovery: %v", err)
		}
		panic("Failed to expose API specifications")
	}
	for _, warning := range discoveryResult.Warnings {
		log.Warnf("Warning during API specifications discovery: %s", warning)
	}
	for _, endpointConfig := range discoveryResult.Endpoints {
		log.Debugf("Registering API specification endpoint with path: %s and spec metadata: %+v",
			endpointConfig.Path, endpointConfig.SpecMetadata)
		r.HandleFunc(endpointConfig.Path, endpointConfig.Handler).Methods(http.MethodGet)
	}
}

func makeServer(systemInfoService service.SystemInfoService, r *mux.Router) *http.Server {
	listenAddr := systemInfoService.GetListenAddress()

	log.Infof("Listen addr = %s", listenAddr)

	var corsOptions []handlers.CORSOption
	corsOptions = append(corsOptions, handlers.AllowedHeaders([]string{
		"Connection", "Accept-Encoding", "Content-Encoding", "X-Requested-With", "Content-Type", "Authorization",
	}))

	allowedOrigins := systemInfoService.GetAllowedOrigins()
	if len(allowedOrigins) > 0 {
		corsOptions = append(corsOptions, handlers.AllowedOrigins(allowedOrigins))
	}
	corsOptions = append(corsOptions, handlers.AllowedMethods([]string{
		"GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
	}))

	// ReadTimeout limits the time for the client to send the full request (headers + body). The timer
	// starts when the connection is accepted and applies to the entire read phase, which protects against
	// slow or abandoned connections consuming server resources.
	//
	// WriteTimeout is intentionally NOT set. Go's WriteTimeout starts its timer when the request headers
	// are read, so it covers handler execution as well as response writing, which makes it unsuitable for
	// a long-running request: a handler that legitimately runs for minutes would have no time left to
	// write. Instead the write deadline is set per request, on the response-writing phase only, by
	// middleware/write_deadline_middleware.go.
	handler := handlers.CompressHandler(handlers.CORS(corsOptions...)(r))

	return &http.Server{
		Handler:     handler,
		Addr:        listenAddr,
		ReadTimeout: serverReadTimeout,
	}
}
