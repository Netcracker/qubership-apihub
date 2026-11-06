// documents-backend: APIHUB extension that stores and serves generic Markdown articles and their files, and exposes
// package-article metadata whose bodies live in APIHUB. Wiring and route registration follow qubership-apihub-backend.
package main

import (
	"context"
	"flag"
	"net/http"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/controller"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/db"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/security"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
)

func main() {
	importDir := flag.String("import", "", "import this directory (articles.yaml + *.md + articles/<slug>/**) and exit")
	flag.Parse()

	systemInfoService, err := service.NewSystemInfoService()
	if err != nil {
		panic(err)
	}
	setLogLevel(systemInfoService.GetLogLevel())
	log.SetFormatter(&log.TextFormatter{FullTimestamp: true, TimestampFormat: "2006-01-02 15:04:05"})

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
		log.Error("Failed to create dbMigrationService: " + err.Error())
		panic("Failed to create dbMigrationService: " + err.Error())
	}

	healthController := controller.NewHealthController(readyChan)
	r.HandleFunc("/live", healthController.HandleLiveRequest).Methods(http.MethodGet)
	r.HandleFunc("/ready", healthController.HandleReadyRequest).Methods(http.MethodGet)

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
			log.Error("Failed to perform DB migration: " + err.Error())
			time.Sleep(time.Second * 10) // Give a chance to read the unrecoverable error
			panic("Failed to perform DB migration: " + err.Error())
		}
		migrationPassedChan <- true
	}()
	wg.Wait()
	<-initSrvStoppedChan // wait for the init srv to stop to avoid a multiple-servers race
	log.Infof("Migration step passed, continue initialization")

	resp := responder.NewResponder(systemInfoService.ShowDebugInResponse())
	apihubClient := client.NewApihubClient(systemInfoService.GetApihubUrl(), systemInfoService.GetApihubTimeout())

	articleRepository := repository.NewArticleRepositoryPG(cp)
	articleFileRepository := repository.NewArticleFileRepositoryPG(cp)
	fileDataRepository := repository.NewFileDataRepositoryPG(cp)
	transactionRunner := repository.NewTransactionRunnerPG(cp)
	navigationRepository := repository.NewNavigationRepositoryPG(cp)
	homeArticleRepository := repository.NewHomeArticleRepositoryPG(cp)

	articleService := service.NewArticleService(transactionRunner, articleRepository, articleFileRepository, fileDataRepository, apihubClient, systemInfoService.GetPackageAccessCacheTtl())
	articleFileService := service.NewArticleFileService(transactionRunner, articleRepository, articleFileRepository, fileDataRepository, systemInfoService.GetMaxUploadSizeBytes())
	apihubRelayService := service.NewApihubRelayService(apihubClient)
	navigationService := service.NewNavigationService(navigationRepository, articleRepository, articleService)
	packageAccessService := service.NewPackageAccessService(apihubClient, articleRepository, navigationRepository)
	homeArticleService := service.NewHomeArticleService(transactionRunner, homeArticleRepository, articleRepository, articleService)
	importService := service.NewImportService(transactionRunner, articleRepository, articleFileRepository, fileDataRepository, navigationRepository, homeArticleRepository, articleService, systemInfoService.GetMaxUploadSizeBytes())
	exportService := service.NewExportService(articleRepository, articleFileRepository, fileDataRepository, navigationRepository, homeArticleRepository)

	if *importDir != "" {
		result, err := importService.ImportDir(secctx.MakeSystemContext(context.Background(), "cli-import"), *importDir, service.ImportOptions{})
		if err != nil {
			log.Fatalf("Import failed: %v", err)
		}
		log.Infof("Imported %d articles, %d files, %d navigation sections and %d items from %s", result.Articles, result.Files, result.Sections, result.Items, *importDir)
		return
	}

	publicKeyProvider := security.NewPublicKeyProvider(apihubClient)
	anonymousAccessProvider := security.NewAnonymousAccessProvider(apihubClient, systemInfoService.GetConfigurationCacheTtl())
	authenticator := security.NewAuthenticator(apihubClient, publicKeyProvider, anonymousAccessProvider, resp)
	warmUpApihub(publicKeyProvider, anonymousAccessProvider)

	articleController := controller.NewArticleController(articleService, resp)
	adminArticleController := controller.NewAdminArticleController(articleService, articleFileService, apihubRelayService, packageAccessService, systemInfoService.GetMaxUploadSizeBytes(), resp)
	adminArticleFileController := controller.NewAdminArticleFileController(articleFileService, packageAccessService, systemInfoService.GetMaxUploadSizeBytes(), resp)
	articleFileController := controller.NewArticleFileController(articleFileService, resp)
	importExportController := controller.NewImportExportController(importService, exportService, resp)
	navigationController := controller.NewNavigationController(navigationService, resp)
	adminNavigationController := controller.NewAdminNavigationController(navigationService, packageAccessService, resp)
	homeArticleController := controller.NewHomeArticleController(homeArticleService, resp)
	adminHomeArticleController := controller.NewAdminHomeArticleController(homeArticleService, resp)

	// Read side: anonymous allowed only while APIHUB anonymousAccess.enabled is true. nginx strips /docs-backend.
	r.HandleFunc("/api/v1/articles", authenticator.SecureOrAnonymous(articleController.GetArticles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/articles/{slug}", authenticator.SecureOrAnonymous(articleController.GetArticle)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/articles/{slug}/files/{path:.+}", authenticator.SecureOrAnonymous(articleFileController.GetArticleFile)).Methods(http.MethodGet, http.MethodHead)
	r.HandleFunc("/api/v1/navigation", authenticator.SecureOrAnonymous(navigationController.GetNavigation)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/home-articles", authenticator.SecureOrAnonymous(homeArticleController.GetHomeArticles)).Methods(http.MethodGet)

	// Admin side: valid credentials required; the controllers additionally require the System administrator role.
	r.HandleFunc("/api/v1/admin/articles", authenticator.Secure(adminArticleController.GetAllArticles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/articles", authenticator.Secure(adminArticleController.CreateArticle)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/articles/{id}", authenticator.Secure(adminArticleController.UpdateArticle)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/admin/articles/{id}", authenticator.Secure(adminArticleController.DeleteArticle)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v1/admin/articles/{id}/publish", authenticator.Secure(adminArticleController.PublishArticle)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/articles/{id}/unpublish", authenticator.Secure(adminArticleController.UnpublishArticle)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/articles/{id}/files", authenticator.Secure(adminArticleFileController.GetArticleFiles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/articles/{id}/files", authenticator.Secure(adminArticleFileController.UploadArticleFiles)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/articles/{id}/files/{path:.+}", authenticator.Secure(adminArticleFileController.DeleteArticleFile)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v1/admin/apihub/packages/{packageId}/versions", authenticator.Secure(adminArticleController.GetApihubPackageVersions)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/apihub/packages/{packageId}/versions/{version}/documents", authenticator.Secure(adminArticleController.GetApihubVersionDocuments)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/navigation", authenticator.Secure(adminNavigationController.GetNavigation)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/navigation/sections", authenticator.Secure(adminNavigationController.CreateSection)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/navigation/sections/{id}", authenticator.Secure(adminNavigationController.UpdateSection)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/admin/navigation/sections/{id}", authenticator.Secure(adminNavigationController.DeleteSection)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v1/admin/navigation/items", authenticator.Secure(adminNavigationController.CreateItem)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/navigation/items/{id}", authenticator.Secure(adminNavigationController.UpdateItem)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/admin/navigation/items/{id}", authenticator.Secure(adminNavigationController.DeleteItem)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v1/admin/home-articles", authenticator.Secure(adminHomeArticleController.GetHomeArticles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/admin/home-articles", authenticator.Secure(adminHomeArticleController.SetHomeArticles)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/admin/import", authenticator.Secure(importExportController.Import)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/admin/export", authenticator.Secure(importExportController.Export)).Methods(http.MethodGet)

	// Compatibility aliases under the API prefix so health checks also work through the nginx prefix.
	r.HandleFunc("/api/v1/health", healthController.HandleLiveRequest).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/ready", healthController.HandleReadyRequest).Methods(http.MethodGet)

	knownPathPrefixes := []string{
		"/api/",
		"/live/",
		"/ready/",
	}
	for _, prefix := range knownPathPrefixes {
		// add routing for unknown paths with known path prefixes
		r.PathPrefix(prefix).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Warnf("Requested unknown endpoint: %v %v", r.Method, r.RequestURI)
			resp.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusMisdirectedRequest,
				Code:    exception.UnknownEndpoint,
				Message: exception.UnknownEndpointMsg,
			})
		})
	}

	srv := makeServer(systemInfoService, r)
	log.Fatalf("%v", srv.ListenAndServe())
}

// warmUpApihub fetches the public key and the anonymous flag once so the first request does not pay for it.
// Failures are logged only: APIHUB may simply not be up yet.
func warmUpApihub(publicKeyProvider security.PublicKeyProvider, anonymousAccessProvider security.AnonymousAccessProvider) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := publicKeyProvider.GetPublicKey(ctx, false); err != nil {
		log.Warnf("APIHUB public key not loaded yet: %v", err)
	}
	log.Infof("APIHUB anonymous access enabled: %v", anonymousAccessProvider.IsAnonymousAccessEnabled(ctx))
}

func makeServer(systemInfoService service.SystemInfoService, r *mux.Router) *http.Server {
	listenAddr := systemInfoService.GetListenAddress()
	log.Infof("Listen addr = %s", listenAddr)

	var corsOptions []handlers.CORSOption
	corsOptions = append(corsOptions, handlers.AllowedHeaders([]string{"Connection", "Accept-Encoding", "Content-Encoding", "X-Requested-With", "Content-Type", "Authorization", "api-key", "If-None-Match"}))
	if allowedOrigins := systemInfoService.GetAllowedOrigins(); len(allowedOrigins) > 0 {
		corsOptions = append(corsOptions, handlers.AllowedOrigins(allowedOrigins))
	}
	corsOptions = append(corsOptions, handlers.AllowedMethods([]string{"GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"}))

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
