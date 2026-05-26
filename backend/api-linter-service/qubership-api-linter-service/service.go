package main

import (
	"context"
	"net/http"
	"os"
	"runtime/debug"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-api-linter-service/client"
	"github.com/Netcracker/qubership-api-linter-service/db"
	"github.com/Netcracker/qubership-api-linter-service/exception"
	midldleware "github.com/Netcracker/qubership-api-linter-service/middleware"
	"github.com/Netcracker/qubership-api-linter-service/repository"
	"github.com/Netcracker/qubership-api-linter-service/security"
	exposer "github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer"
	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"
	"github.com/google/uuid"

	"github.com/Netcracker/qubership-api-linter-service/controller"
	"github.com/Netcracker/qubership-api-linter-service/service"
	"github.com/Netcracker/qubership-api-linter-service/utils"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"

	_ "net/http/pprof"
)

func init() {
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

	basePath := systemInfoService.GetBasePath()
	r := mux.NewRouter().SkipClean(true).UseEncodedPath()
	r.Use(midldleware.WriteDeadlineMiddleware)

	creds := systemInfoService.GetCredsFromEnv()
	cp := db.NewConnectionProvider(creds)
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
	////

	olricProvider, err := client.NewOlricProvider(
		systemInfoService.GetOlricDiscoveryMode(),
		systemInfoService.GetReplicaCount(),
		systemInfoService.GetNamespace(),
		systemInfoService.GetAPIHubUrl())
	if err != nil {
		log.Error("Failed to create olricProvider: " + err.Error())
		panic("Failed to create olricProvider: " + err.Error())
	}

	apihubClient := client.NewApihubClient(systemInfoService.GetAPIHubUrl(), systemInfoService.GetApihubAccessToken())

	utils.SafeAsync(func() {
		systemInfoService.SetProductionMode(apihubClient)
	})

	err = security.SetupGoGuardian(apihubClient)
	if err != nil {
		log.Fatalf("Failed to setup go guardian: %s", err.Error())
	}
	log.Info("go_guardian is set up")

	executorId := uuid.NewString()
	log.Infof("executorId = %s", executorId)

	versionLintTaskRepository := repository.NewVersionLintTaskRepository(cp)
	docLintTaskRepository := repository.NewDocLintTaskRepository(cp)
	ruleSetRepository := repository.NewRuleSetRepository(cp)
	docResultRepository := repository.NewDocResultRepository(cp)
	versionResultRepository := repository.NewVersionResultRepository(cp)
	lintResultRepository := repository.NewLintResultRepository(cp)
	scoringRepository := repository.NewScoringRepository(cp)

	linterConfigService := service.NewLinterConfigService(systemInfoService)
	linterSelectorService := service.NewLinterSelectorService(ruleSetRepository, linterConfigService)
	scoringService := service.NewScoringService(versionResultRepository, lintResultRepository, ruleSetRepository, scoringRepository, apihubClient)

	docTaskNotify := make(chan struct{}, 1)
	versionTaskNotify := make(chan struct{}, 1)
	versionTaskProcessor := service.NewVersionTaskProcessor(versionLintTaskRepository, docLintTaskRepository, versionResultRepository, apihubClient, linterSelectorService, scoringService, executorId, docTaskNotify, versionTaskNotify)
	spectralExecutor, err := service.NewSpectralExecutor(systemInfoService.GetSpectralBinPath()) // TODO: use linters config
	if err != nil {
		log.Fatalf("Failed to create Spectral executor: %s", err.Error())
	}

	aiOasExecutor, err := service.NewAiOasExecutor(systemInfoService)
	if err != nil {
		log.Fatalf("Failed to create AiOas executor: %s", err.Error())
	}

	docTaskProcessor := service.NewDocTaskProcessor(docLintTaskRepository, ruleSetRepository, docResultRepository, lintResultRepository, apihubClient, spectralExecutor, aiOasExecutor, executorId, systemInfoService.GetSpectralLinterWorkers(), systemInfoService.GetAiLinterWorkers(), docTaskNotify)

	validationService := service.NewValidationService(versionLintTaskRepository, versionResultRepository, lintResultRepository, ruleSetRepository, docLintTaskRepository, versionTaskProcessor, apihubClient, executorId, versionTaskNotify)
	publishEventListener := service.NewPublishEventListener(olricProvider, validationService)
	rulesetService := service.NewRulesetService(ruleSetRepository)
	cleanupService := service.NewCleanupService(cp)
	authorizationService := service.NewAuthorizationService(apihubClient)

	mcpService := service.NewMCPService(validationService, authorizationService)
	mcpController := controller.NewMCPController(mcpService)
	mcpHandler := mcpController.MakeMCPServer()
	r.Handle("/api/v1/mcp/", security.SecureMCP(mcpHandler))

	validationController := controller.NewValidationController(validationService, authorizationService)
	validationResultController := controller.NewValidationResultController(validationService, authorizationService)
	rulesetController := controller.NewRulesetController(rulesetService, authorizationService)
	cleanupController := controller.NewCleanupController(cleanupService, authorizationService, systemInfoService)
	healthController := controller.NewHealthController(readyChan)
	logsController := controller.NewLogsController()
	linterController := controller.NewLinterController(linterConfigService)
	scoringController := controller.NewScoringController(scoringService, authorizationService)

	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/validation", security.Secure(validationController.ValidateVersion)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/bulkValidation", security.Secure(validationController.StartBulkValidation)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/bulkValidation/{jobId}", security.Secure(validationController.GetBulkValidationStatus)).Methods(http.MethodGet)

	// Validation result
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/validation/summary", security.Secure(validationResultController.GetValidationSummaryForVersion_deprecated)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/validation/summary", security.Secure(validationResultController.GetValidationSummaryForVersion)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/validation/documents/{slug}/details", security.Secure(validationResultController.GetValidationResultForDocument_deprecated)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/validation/documents/{slug}/details", security.Secure(validationResultController.GetValidationResultForDocument)).Methods(http.MethodGet)

	// Scoring
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/scoring", security.Secure(scoringController.GetScoringForVersion)).Methods(http.MethodGet)

	// Linters
	r.HandleFunc("/api/v1/linters", security.Secure(linterController.ListLinters)).Methods(http.MethodGet)

	// Ruleset management
	r.HandleFunc("/api/v1/rulesets", security.Secure(rulesetController.CreateRuleset)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/rulesets/{ruleset_id}/activation", security.Secure(rulesetController.ActivateRuleset)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/rulesets", security.Secure(rulesetController.ListRulesets)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/rulesets/{ruleset_id}", security.Secure(rulesetController.GetRuleset)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/rulesets/{ruleset_id}/data", security.NoSecure(rulesetController.GetRulesetData)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/rulesets/{ruleset_id}/activation", security.Secure(rulesetController.GetRulesetActivationHistory)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/rulesets/{ruleset_id}", security.Secure(rulesetController.DeleteRuleset)).Methods(http.MethodDelete)

	r.HandleFunc("/api/v1/debug/logs/setLevel", security.Secure(logsController.SetLogLevel)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/debug/logs/checkLevel", security.Secure(logsController.CheckLogLevel)).Methods(http.MethodGet)

	// Test data cleanup
	r.HandleFunc("/api/internal/clear/{testId}", security.Secure(cleanupController.ClearTestData)).Methods(http.MethodDelete)

	// Service endpoints
	r.HandleFunc("/live", healthController.HandleLiveRequest).Methods(http.MethodGet)
	r.HandleFunc("/ready", healthController.HandleReadyRequest).Methods(http.MethodGet)
	r.PathPrefix("/debug/").Handler(http.DefaultServeMux) // TODO: env to config!

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
	if len(discoveryResult.Warnings) > 0 {
		for _, warning := range discoveryResult.Warnings {
			log.Warnf("Warning during API specifications discovery: %s", warning)
		}
	}
	for _, endpointConfig := range discoveryResult.Endpoints {
		log.Debugf("Registering API specification endpoint with path: %s and spec metadata: %+v", endpointConfig.Path, endpointConfig.SpecMetadata)
		r.HandleFunc(endpointConfig.Path, endpointConfig.Handler).Methods(http.MethodGet)
	}

	publishEventListener.Start()
	docTaskProcessor.Start()

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
	corsHandler := handlers.CORS(corsOptions...)(r)
	compressedHandler := handlers.CompressHandler(corsHandler)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/v1/mcp/") {
			corsHandler.ServeHTTP(w, r)
			return
		}
		compressedHandler.ServeHTTP(w, r)
	})

	return &http.Server{
		Handler:     handler,
		Addr:        listenAddr,
		ReadTimeout: 60 * time.Second,
	}
}
