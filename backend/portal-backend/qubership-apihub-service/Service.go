package main

import (
	"context"
	"io"
	"net/http"
	_ "net/http/pprof"
	"os"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security/idp/providers"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service/cleanup"
	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer/config"

	"gopkg.in/natefinch/lumberjack.v2"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	mController "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/controller"
	mRepository "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/repository"
	mService "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/migration/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/cache"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/controller"
	midldleware "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/middleware"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"

	exposer "github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
	prefixed "github.com/x-cray/logrus-prefixed-formatter"
)

const startupOperationTimeout = 60 * time.Second

func init() {
	logFilePath := os.Getenv("LOG_FILE_PATH") //Example: /logs/apihub.log
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
		panic(err)
	}

	if err := utils.ValidateTLSAtStartup(); err != nil {
		log.Fatalf("TLS configuration failed: %v", err)
	}
	basePath := systemInfoService.GetBasePath()

	// Create router and server to expose live and ready endpoints during initialization
	readyChan := make(chan bool)
	migrationPassedChan := make(chan bool)
	initSrvStoppedChan := make(chan bool)
	r := mux.NewRouter()
	// r.Use(midldleware.PrometheusMiddleware) todo figure out why breaks streaming
	r.Use(midldleware.WriteDeadlineMiddleware)
	r.Use(midldleware.RequestTimeoutMiddleware(systemInfoService.GetRequestTimeout()))
	r.SkipClean(true)
	r.UseEncodedPath()
	healthController := controller.NewHealthController(readyChan)
	r.HandleFunc("/live", healthController.HandleLiveRequest).Methods(http.MethodGet)
	r.HandleFunc("/ready", healthController.HandleReadyRequest).Methods(http.MethodGet)
	initSrv := makeServer(systemInfoService, r)

	creds := systemInfoService.GetCredsFromEnv()

	cp := db.NewConnectionProvider(creds)

	migrationRunRepository := mRepository.NewMigrationRunRepository(cp)
	buildCleanupRepository := repository.NewBuildCleanupRepository(cp)
	transitionRepository := repository.NewTransitionRepository(cp)
	buildResultRepository := repository.NewBuildResultRepository(cp)
	publishedRepository, err := repository.NewPublishedRepositoryPG(cp)
	if err != nil {
		log.Error("Failed to create PublishedRepository: " + err.Error())
		panic("Failed to create PublishedRepository: " + err.Error())
	}
	minioStorageCreds := systemInfoService.GetMinioStorageCreds()
	minioStorageService := service.NewMinioStorageService(buildResultRepository, publishedRepository, minioStorageCreds, systemInfoService.GetMinioMigrationTimeouts())
	dbMigrationService, err := mService.NewDBMigrationService(cp, migrationRunRepository, buildCleanupRepository, transitionRepository, systemInfoService, minioStorageService)
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

		currentVersion, newVersion, migrationRequired, err := dbMigrationService.Migrate(basePath)
		if err != nil {
			log.Error("Failed perform DB migration: " + err.Error())
			time.Sleep(time.Second * 10) // Give a chance to read the unrecoverable error
			panic("Failed perform DB migration: " + err.Error())
		}
		// to perform migrations, which could not be implemented with "pure" SQL
		err = dbMigrationService.SoftMigrateDb(currentVersion, newVersion, migrationRequired)
		if err != nil {
			log.Errorf("Failed to perform db migrations: %v", err.Error())
			time.Sleep(time.Second * 10) // Give a chance to read the unrecoverable error
			panic("Failed to perform db migrations: " + err.Error())
		}

		migrationPassedChan <- true
	}()

	wg.Wait()
	_ = <-initSrvStoppedChan // wait for the init srv to stop to avoid multiple servers started race condition
	log.Infof("Migration step passed, continue initialization")

	favoritesRepository, err := repository.NewFavoritesRepositoryPG(cp)
	if err != nil {
		log.Error("Failed to create FavoriteRepository: " + err.Error())
		panic("Failed to create FavoriteRepository: " + err.Error())
	}

	usersRepository, err := repository.NewUserRepositoryPG(cp)
	if err != nil {
		log.Error("Failed to create UsersRepository: " + err.Error())
		panic("Failed to create UsersRepository: " + err.Error())
	}
	apihubApiKeyRepository, err := repository.NewApihubApiKeyRepositoryPG(cp)
	if err != nil {
		log.Error("Failed to create ApihubApiKeyRepository: " + err.Error())
		panic("Failed to create ApihubApiKeyRepository: " + err.Error())
	}
	buildRepository, err := repository.NewBuildRepositoryPG(cp)
	if err != nil {
		log.Error("Failed to create BuildRepository: " + err.Error())
		panic("Failed to create BuildRepository: " + err.Error())
	}

	roleRepository := repository.NewRoleRepository(cp)
	operationRepository := repository.NewOperationRepository(cp)
	ddlContractRepository := repository.NewDDLContractRepository(cp)
	mcpContractRepository := repository.NewMCPContractRepository(cp)
	businessMetricRepository := repository.NewBusinessMetricRepository(cp)

	activityTrackingRepository := repository.NewActivityTrackingRepository(cp)

	versionCleanupRepository := repository.NewVersionCleanupRepository(cp)
	comparisonCleanupRepository := repository.NewComparisonCleanupRepository(cp)

	personalAccessTokenRepository := repository.NewPersonalAccessTokenRepository(cp)

	packageExportConfigRepository := repository.NewPackageExportConfigRepository(cp)

	exportRepository := repository.NewExportRepository(cp)

	systemStatsRepository := repository.NewSystemStatsRepository(cp)

	deletedDataCleanupRepository := repository.NewSoftDeletedDataCleanupRepository(cp)

	unreferencedDataCleanupRepository := repository.NewUnreferencedDataCleanupRepository(cp)

	lockRepo := repository.NewLockRepository(cp)

	olricProvider, err := cache.NewOlricProvider(systemInfoService.GetOlricConfig())
	if err != nil {
		log.Error("Failed to create olricProvider: " + err.Error())
		panic("Failed to create olricProvider: " + err.Error())
	}

	privateUserPackageService := service.NewPrivateUserPackageService(publishedRepository, usersRepository, roleRepository, favoritesRepository)
	userService := service.NewUserService(usersRepository, systemInfoService, privateUserPackageService)

	lockService := service.NewLockService(lockRepo, systemInfoService.GetInstanceId())

	monitoringService := service.NewMonitoringService(cp)

	cleanupService := cleanup.NewCleanupService(cp)
	if err := cleanupService.CreateRevisionsCleanupJob(publishedRepository, migrationRunRepository, versionCleanupRepository, monitoringService, lockService, systemInfoService.GetInstanceId(), systemInfoService.GetRevisionsCleanupSchedule(), systemInfoService.GetRevisionsCleanupDeleteLastRevision(), systemInfoService.GetRevisionsCleanupDeleteReleaseRevisions(), systemInfoService.GetRevisionsTTLDays()); err != nil {
		log.Error("Failed to start revisions cleaning job" + err.Error())
	}
	if err := cleanupService.CreateComparisonsCleanupJob(publishedRepository, migrationRunRepository, comparisonCleanupRepository, lockService, systemInfoService.GetInstanceId(), systemInfoService.GetComparisonCleanupSchedule(), systemInfoService.GetComparisonCleanupTimeout(), systemInfoService.GetComparisonsTTLDays()); err != nil {
		log.Error("Failed to start comparisons cleaning job" + err.Error())
	}
	if err := cleanupService.CreateSoftDeletedDataCleanupJob(publishedRepository, migrationRunRepository, deletedDataCleanupRepository, lockService, systemInfoService.GetInstanceId(), systemInfoService.GetSoftDeletedDataCleanupSchedule(), systemInfoService.GetSoftDeletedDataCleanupTimeout(), systemInfoService.GetSoftDeletedDataTTLDays()); err != nil {
		log.Error("Failed to start soft deleted data cleaning job" + err.Error())
	}
	if err := cleanupService.CreateUnreferencedDataCleanupJob(migrationRunRepository, unreferencedDataCleanupRepository, lockService, systemInfoService.GetInstanceId(), systemInfoService.GetUnreferencedDataCleanupSchedule(), systemInfoService.GetUnreferencedDataCleanupTimeout()); err != nil {
		log.Error("Failed to start unreferenced data cleaning job" + err.Error())
	}
	if err := cleanupService.CreateMaintenanceVacuumCleanupJob(migrationRunRepository, lockService, systemInfoService.GetInstanceId(), systemInfoService.GetMaintenanceVacuumCleanupSchedule(), systemInfoService.GetMaintenanceVacuumCleanupTimeout()); err != nil {
		log.Error("Failed to start maintenance vacuum cleaning job" + err.Error())
	}

	packageVersionEnrichmentService := service.NewPackageVersionEnrichmentService(publishedRepository)
	activityTrackingService := service.NewActivityTrackingService(activityTrackingRepository, publishedRepository, userService)
	operationService := service.NewOperationService(operationRepository, publishedRepository, packageVersionEnrichmentService)
	roleService := service.NewRoleService(roleRepository, userService, activityTrackingService, publishedRepository)
	ptHandler := service.NewPackageTransitionHandler(transitionRepository)
	publishNotificationService := service.NewPublishNotificationService(olricProvider)
	publishedService := service.NewPublishedService(publishedRepository, buildRepository, favoritesRepository, operationRepository, ddlContractRepository, activityTrackingService, monitoringService, minioStorageService, systemInfoService, publishNotificationService, roleService)
	portalService := service.NewPortalService(basePath, publishedService, publishedRepository)

	operationGroupService := service.NewOperationGroupService(operationRepository, publishedRepository, exportRepository, packageVersionEnrichmentService, activityTrackingService, publishedService, systemInfoService)
	ddlContractServiceForVersion := service.NewDDLContractService(ddlContractRepository, publishedRepository, packageVersionEnrichmentService)
	mcpContractServiceForVersion := service.NewMCPContractService(mcpContractRepository, publishedRepository, packageVersionEnrichmentService)
	versionService := service.NewVersionService(favoritesRepository, publishedRepository, publishedService, operationRepository, exportRepository, operationService, activityTrackingService, systemInfoService, packageVersionEnrichmentService, portalService, versionCleanupRepository, operationGroupService, monitoringService, roleService, ddlContractServiceForVersion, mcpContractServiceForVersion)
	packageService := service.NewPackageService(favoritesRepository, publishedRepository, versionService, roleService, activityTrackingService, monitoringService, operationGroupService, usersRepository, ptHandler, systemInfoService)

	logsService := service.NewLogsService()
	apihubApiKeyService := service.NewApihubApiKeyService(apihubApiKeyRepository, publishedRepository, activityTrackingService, userService, roleRepository, systemInfoService)

	refResolverService := service.NewRefResolverService(publishedRepository)
	buildProcessorService := service.NewBuildProcessorService(buildRepository, refResolverService)
	buildService := service.NewBuildService(buildRepository, buildProcessorService, publishedService, systemInfoService, packageService, refResolverService)

	packageExportConfigService := service.NewPackageExportConfigService(packageExportConfigRepository, packageService)

	exportService := service.NewExportService(exportRepository, buildService, packageExportConfigService)

	buildResultService := service.NewBuildResultService(buildResultRepository, buildRepository, publishedRepository, systemInfoService, minioStorageService, publishedService, exportService)
	versionService.SetBuildService(buildService)
	operationGroupService.SetBuildService(buildService)

	excelService := service.NewExcelService(publishedRepository, versionService, operationService, packageService, ddlContractServiceForVersion, mcpContractServiceForVersion)
	comparisonService := service.NewComparisonService(publishedRepository, operationRepository, packageVersionEnrichmentService, ddlContractServiceForVersion)
	businessMetricService := service.NewBusinessMetricService(businessMetricRepository)

	dbCleanupService := service.NewDBCleanupService(buildCleanupRepository, migrationRunRepository, minioStorageService, systemInfoService)
	if err := dbCleanupService.CreateCleanupJob(systemInfoService.GetBuildsCleanupSchedule()); err != nil {
		log.Error("Failed to start cleaning job" + err.Error())
	}

	transitionService := service.NewTransitionService(transitionRepository, publishedRepository, systemInfoService)
	transformationService := service.NewTransformationService(publishedRepository, operationRepository, packageVersionEnrichmentService)

	zeroDayAdminService := service.NewZeroDayAdminService(userService, roleService, usersRepository, systemInfoService)

	personalAccessTokenService := service.NewPersonalAccessTokenService(personalAccessTokenRepository, userService, roleService)

	tokenRevocationService := service.NewTokenRevocationService(olricProvider, systemInfoService.GetRefreshTokenDurationSec())
	systemStatsService := service.NewSystemStatsService(systemStatsRepository)

	ddlContractService := ddlContractServiceForVersion
	mcpContractService := mcpContractServiceForVersion

	mcpService := service.NewMCPService(systemInfoService, operationService, packageService, versionService, monitoringService, roleService, ddlContractService, mcpContractService)

	responder := responder.NewResponder(systemInfoService.ShowDebugInResponse())
	authenticator, err := security.NewAuthenticator(userService, roleService, apihubApiKeyService, personalAccessTokenService, systemInfoService, tokenRevocationService, responder)

	if err != nil {
		log.Fatalf("Can't setup authenticator. Error - %s", err.Error())
	}
	ephemeralFileRepository := repository.NewEphemeralFileRepositoryPG(cp)
	ephemeralFileService := service.NewEphemeralFileService(systemInfoService, ephemeralFileRepository)
	ephemeralFileController := controller.NewEphemeralFileController(ephemeralFileService, responder, authenticator)
	ephemeralFileCleanup := service.NewEphemeralFileCleanupService(ephemeralFileRepository, lockService)
	if err := ephemeralFileCleanup.StartCleanupJob(systemInfoService.GetEphemeralFilesCleanupSchedule(), systemInfoService.GetEphemeralFileDirectory()); err != nil {
		log.Warnf("Failed to start ephemeral files cleanup: %v", err)
	}

	aiChatEnabled := isAiChatEnabled(systemInfoService)
	var aiChatController *controller.AiChatController
	if aiChatEnabled {
		log.Info("ai-chat: routes and cleanup jobs are ENABLED")
		aiChatRepository := repository.NewAiChatRepositoryPG(cp)
		llmClient, err := client.NewOpenAILlmClient(systemInfoService.GetAiChatConfig().OpenAI)
		if err != nil {
			log.Fatalf("Failed to create OpenAI LLM client: %v", err)
		}
		aiChatsService := service.NewAiChatsService(aiChatRepository)
		aiChatTurnService, err := service.NewAiChatTurnService(systemInfoService, aiChatRepository, llmClient, mcpService, ephemeralFileService, authenticator.MintEphemeralFileToken)
		if err != nil {
			log.Fatalf("Failed to create AiChatTurnService: %v", err)
		}
		aiChatController = controller.NewAiChatController(aiChatsService, aiChatTurnService, monitoringService, responder)
		aiChatCleanup := service.NewAiChatCleanupService(aiChatRepository, lockService)
		aiCfg := systemInfoService.GetAiChatConfig()
		if err := aiChatCleanup.StartChatRetentionJob(aiCfg.CleanupSchedule, aiCfg.RetentionDays, aiCfg.PinnedForeverCount); err != nil {
			log.Warnf("Failed to start ai chat retention cleanup: %v", err)
		}
	}

	idpManager, err := providers.NewIDPManager(systemInfoService.GetAuthConfig(), systemInfoService.GetAllowedHosts(), systemInfoService.IsProductionMode(), userService, responder, authenticator)
	if err != nil {
		log.Error("Failed to initialize external IDP: " + err.Error())
		panic("Failed to initialize external IDP: " + err.Error())
	}

	publishedController := controller.NewPublishedController(publishedService, portalService, roleService, responder)

	logsController := controller.NewLogsController(logsService, responder)
	systemInfoController := controller.NewSystemInfoController(systemInfoService, dbMigrationService, responder)
	sysAdminController := controller.NewSysAdminController(roleService, responder)
	apihubApiKeyController := controller.NewApihubApiKeyController(apihubApiKeyService, roleService, responder)
	cleanupController := controller.NewCleanupController(cleanupService, responder)

	playgroundProxyController, err := controller.NewPlaygroundProxyController(systemInfoService, responder)
	if err != nil {
		log.Fatalf("Failed to create PlaygroundProxyController: %v", err)
	}
	publishV2Controller := controller.NewPublishV2Controller(buildService, publishedService, buildResultService, roleService, systemInfoService, packageService, responder)
	exportController := controller.NewExportController(publishedService, portalService, roleService, excelService, versionService, monitoringService, exportService, packageService, responder)

	packageController := controller.NewPackageController(packageService, publishedService, portalService, roleService, monitoringService, ptHandler, responder)
	versionController := controller.NewVersionController(versionService, roleService, monitoringService, ptHandler, excelService, systemInfoService.GetShareabilityReportSizeLimitMB(), responder)
	roleController := controller.NewRoleController(roleService, responder)
	samlAuthController := controller.NewSamlAuthController(userService, systemInfoService, idpManager, responder, authenticator) //deprecated
	authController := controller.NewAuthController(systemInfoService, idpManager, responder)
	userController := controller.NewUserController(userService, privateUserPackageService, roleService, responder)
	jwtPubKeyController := controller.NewJwtPubKeyController(responder, authenticator)
	logoutController := controller.NewLogoutController(tokenRevocationService, systemInfoService, responder)
	operationController := controller.NewOperationController(roleService, operationService, buildService, monitoringService, ptHandler, responder)
	operationGroupController := controller.NewOperationGroupController(roleService, operationGroupService, versionService, systemInfoService, packageService, responder)
	searchController := controller.NewSearchController(operationService, versionService, monitoringService, ddlContractService, mcpContractService, roleService, responder)
	dataMigrationController := mController.NewTempMigrationController(dbMigrationService, responder)
	activityTrackingController := controller.NewActivityTrackingController(activityTrackingService, roleService, ptHandler, responder)
	comparisonController := controller.NewComparisonController(operationService, versionService, buildService, roleService, comparisonService, monitoringService, ptHandler, responder)
	transitionController := controller.NewTransitionController(transitionService, responder)
	businessMetricController := controller.NewBusinessMetricController(businessMetricService, excelService, responder)
	transformationController := controller.NewTransformationController(roleService, buildService, versionService, transformationService, operationGroupService, responder)
	minioStorageController := controller.NewMinioStorageController(minioStorageCreds, minioStorageService, responder)
	personalAccessTokenController := controller.NewPersonalAccessTokenController(personalAccessTokenService, responder)
	packageExportConfigController := controller.NewPackageExportConfigController(roleService, packageExportConfigService, ptHandler, responder)
	systemStatsController := controller.NewSystemStatsController(systemStatsService, responder)
	internalDocsController := controller.NewInternalDocumentController(publishedService, roleService, responder)
	ddlContractController := controller.NewDDLContractController(roleService, ddlContractService, ptHandler, responder)
	mcpContractController := controller.NewMCPContractController(roleService, mcpContractService, ptHandler, responder)

	mcpController := controller.NewMCPController(mcpService)
	buildController := controller.NewBuildController(buildResultService, buildService, responder)
	adminPublishedController := controller.NewAdminPublishedController(publishedService, systemInfoService.GetPublishArchiveSizeLimitMB(), responder)

	r.HandleFunc("/api/v1/system/info", authenticator.Secure(systemInfoController.GetSystemInfo)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/system/configuration", samlAuthController.GetSystemSSOInfo_deprecated).Methods(http.MethodGet) //deprecated
	r.HandleFunc("/api/v2/system/configuration", authenticator.NoSecure(authController.GetSystemConfigurationInfo)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/debug/logs", authenticator.SecureUser(logsController.StoreLogs)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/debug/logs/setLevel", authenticator.Secure(logsController.SetLogLevel)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/debug/logs/checkLevel", authenticator.Secure(logsController.CheckLogLevel)).Methods(http.MethodGet)

	//Search
	r.HandleFunc("/api/v3/search/{searchLevel}", authenticator.Secure(searchController.Search_deprecated)).Methods(http.MethodPost)
	r.HandleFunc("/api/v4/search/{searchLevel}", authenticator.Secure(searchController.Search)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/builders/{builderId}/tasks", authenticator.Secure(publishV2Controller.GetFreeBuild)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/packages", authenticator.Secure(packageController.CreatePackage)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}", authenticator.Secure(packageController.UpdatePackage)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v2/packages/{packageId}", authenticator.Secure(packageController.DeletePackage)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v2/packages/{packageId}/favor", authenticator.Secure(packageController.FavorPackage)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/disfavor", authenticator.Secure(packageController.DisfavorPackage)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}", authenticator.Secure(packageController.GetPackage)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/status", authenticator.Secure(packageController.GetPackageStatus)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages", authenticator.Secure(packageController.GetPackagesList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/publish/availableStatuses", authenticator.Secure(packageController.GetAvailableVersionStatusesForPublish_deprecated)).Methods(http.MethodGet) // deprecated

	r.HandleFunc("/api/v4/packages/{packageId}/apiKeys", authenticator.Secure(apihubApiKeyController.GetApiKeys)).Methods(http.MethodGet)
	r.HandleFunc("/api/v4/packages/{packageId}/apiKeys", authenticator.Secure(apihubApiKeyController.CreateApiKey)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/apiKeys/{id}", authenticator.Secure(apihubApiKeyController.RevokeApiKey)).Methods(http.MethodDelete)

	r.HandleFunc("/api/v2/packages/{packageId}/members", authenticator.Secure(roleController.GetPackageMembers)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/members", authenticator.Secure(roleController.AddPackageMembers)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/members/{userId}", authenticator.Secure(roleController.UpdatePackageMembers)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v2/packages/{packageId}/members/{userId}", authenticator.Secure(roleController.DeletePackageMember)).Methods(http.MethodDelete)

	r.HandleFunc("/api/v2/packages/{packageId}/recalculateGroups", authenticator.Secure(packageController.RecalculateOperationGroups)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/calculateGroups", authenticator.Secure(packageController.CalculateOperationGroups)).Methods(http.MethodGet)

	//api for extensions
	r.HandleFunc("/api/v2/users/{userId}/availablePackagePromoteStatuses", authenticator.Secure(roleController.GetAvailableUserPackagePromoteStatuses)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/packages/{packageId}/publish/{publishId}/status", authenticator.Secure(publishV2Controller.GetPublishStatus)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/publish/statuses", authenticator.Secure(publishV2Controller.GetPublishStatuses)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/publish", authenticator.Secure(publishV2Controller.Publish)).Methods(http.MethodPost)
	r.HandleFunc("/api/v3/packages/{packageId}/publish/{publishId}/status", authenticator.Secure(publishV2Controller.SetPublishStatus)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/packages/{packageId}/publish/withOperationsGroup", authenticator.Secure(versionController.PublishFromCSV_deprecated)).Methods(http.MethodPost) //deprecated
	r.HandleFunc("/api/v2/packages/{packageId}/publish/withOperationsGroup/{apiType}", authenticator.Secure(versionController.PublishFromCSV)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/packages/{packageId}/publish/{publishId}/withOperationsGroup/status", authenticator.Secure(versionController.GetCSVDashboardPublishStatus)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/publish/{publishId}/withOperationsGroup/report", authenticator.Secure(versionController.GetCSVDashboardPublishReport)).Methods(http.MethodGet)

	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}", authenticator.Secure(versionController.GetPackageVersionContent)).Methods(http.MethodGet)
	r.HandleFunc("/api/v3/packages/{packageId}/versions", authenticator.Secure(versionController.GetPackageVersionsList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}", authenticator.Secure(versionController.DeleteVersion)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}", authenticator.Secure(versionController.PatchVersion)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/recursiveDelete", authenticator.Secure(versionController.DeleteVersionsRecursively)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/files/{slug}/raw", authenticator.Secure(versionController.GetVersionedContentFileRaw)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/sharedFiles/{sharedFileId}", authenticator.NoSecure(versionController.GetSharedContentFile)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/changes", authenticator.Secure(versionController.GetVersionChanges_deprecated)).Methods(http.MethodGet)   // deprecated
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/problems", authenticator.Secure(versionController.GetVersionProblems_deprecated)).Methods(http.MethodGet) // deprecated
	r.HandleFunc("/api/v2/sharedFiles", authenticator.Secure(versionController.SharePublishedFile)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/doc", authenticator.Secure(exportController.GenerateVersionDoc)).Methods(http.MethodGet)           // deprecated
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/files/{slug}/doc", authenticator.Secure(exportController.GenerateFileDoc)).Methods(http.MethodGet) // deprecated

	r.HandleFunc("/api/v2/auth/saml", authenticator.NoSecure(samlAuthController.StartSamlAuthentication_deprecated)).Methods(http.MethodGet)   // deprecated
	r.HandleFunc("/login/sso/saml", authenticator.RefreshToken(samlAuthController.StartSamlAuthentication_deprecated)).Methods(http.MethodGet) // deprecated
	r.HandleFunc("/saml/acs", authenticator.NoSecure(samlAuthController.AssertionConsumerHandler_deprecated)).Methods(http.MethodPost)
	r.HandleFunc("/saml/metadata", authenticator.NoSecure(samlAuthController.ServeMetadata_deprecated)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/login/sso/{idpId}", authenticator.RefreshToken(authController.StartAuthentication)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/saml/{idpId}/acs", authenticator.NoSecure(authController.SAMLAssertionConsumerHandler)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/saml/{idpId}/metadata", authenticator.NoSecure(authController.ServeMetadata)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/oidc/{idpId}/callback", authController.OIDCCallbackHandler).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/logout", authenticator.SecureJWT(logoutController.Logout)).Methods(http.MethodPost)

	// Required for agent to verify apihub tokens
	r.HandleFunc("/api/v2/auth/publicKey", authenticator.NoSecure(jwtPubKeyController.GetRsaPublicKey)).Methods(http.MethodGet)
	// Required to verify api key for external authorization
	r.HandleFunc("/api/v2/auth/apiKey", authenticator.NoSecure(apihubApiKeyController.GetApiKeyByKey)).Methods(http.MethodGet)
	// Required to verify PAT for external authorization
	r.HandleFunc("/api/v2/auth/pat", authenticator.NoSecure(personalAccessTokenController.GetPatByPat)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/auth/apiKey/{apiKeyId}", authenticator.Secure(apihubApiKeyController.GetApiKeyById)).Methods(http.MethodGet)
	// Required for extensions to check Apihub auth. Just return 200 OK if authentication is passed.
	r.HandleFunc("/api/v1/auth/token", authenticator.SecureJWT(func(writer http.ResponseWriter, request *http.Request) {})).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/users/{userId}/profile/avatar", authenticator.NoSecure(userController.GetUserAvatar)).Methods(http.MethodGet) // Should not be secured! FE renders avatar as <img src='avatarUrl' and it couldn't include auth header
	r.HandleFunc("/api/v2/users", authenticator.Secure(userController.GetUsers)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/users/{userId}", authenticator.Secure(userController.GetUserById)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/users/{userId}/space", authenticator.Secure(userController.CreatePrivatePackageForUser)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/space", authenticator.SecureUser(userController.CreatePrivateUserPackage)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/space", authenticator.SecureUser(userController.GetPrivateUserPackage)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/user", authenticator.SecureUser(userController.GetExtendedUser_deprecated)).Methods(http.MethodGet) //deprecated
	r.HandleFunc("/api/v2/user", authenticator.SecureUser(userController.GetExtendedUser)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/changes/summary", authenticator.Secure(comparisonController.GetComparisonChangesSummary)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations", authenticator.Secure(operationController.GetOperationList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations/{operationId}", authenticator.Secure(operationController.GetOperation)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations/{operationId}/changes", authenticator.Secure(operationController.GetOperationChanges)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations/{operationId}/models/{modelName}/usages", authenticator.Secure(operationController.GetOperationModelUsages)).Methods(http.MethodGet)
	r.HandleFunc("/api/v4/packages/{packageId}/versions/{version}/{apiType}/changes", authenticator.Secure(operationController.GetOperationsChanges)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/tags", authenticator.Secure(operationController.GetOperationsTags)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/deprecated", authenticator.Secure(operationController.GetDeprecatedOperationsList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations/{operationId}/deprecatedItems", authenticator.Secure(operationController.GetOperationDeprecatedItems)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/deprecated/summary", authenticator.Secure(operationController.GetDeprecatedOperationsSummary)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations/{operationId}/changes/summary", authenticator.Secure(operationController.GetOperationChangesSummary)).Methods(http.MethodGet)

	// DDL Contract routes.
	// Static sub-routes (changes, export/*) are registered before the {ddlEntityId} wildcard
	// so gorilla/mux does not shadow them.
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/ddl/entities", authenticator.Secure(ddlContractController.ListDdlEntities)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/ddl/changes", authenticator.Secure(ddlContractController.GetChangedDdlEntities)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/ddl/export/entities", authenticator.Secure(exportController.GenerateDdlEntitiesExcelReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/ddl/export/changes", authenticator.Secure(exportController.GenerateDdlChangesExcelReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/ddl/entities/{ddlEntityId}", authenticator.Secure(ddlContractController.GetDdlEntity)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/ddl/entities/{ddlEntityId}/changes", authenticator.Secure(ddlContractController.GetDdlEntityChanges)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/ddl/entities/{ddlEntityId}/changes/summary", authenticator.Secure(ddlContractController.GetDdlEntityChangesSummary)).Methods(http.MethodGet)

	// MCP Contract routes ({entity} ∈ {inits, tools, prompts, resources}).
	// mcp/export/{entity} is registered before mcp/{entity}/{mcpEntityId} so it is not shadowed.
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/mcp/export/{entity}", authenticator.Secure(exportController.GenerateMcpEntitiesExcelReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/mcp/{entity}", authenticator.Secure(mcpContractController.ListMcpEntities)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/mcp/{entity}/{mcpEntityId}", authenticator.Secure(mcpContractController.GetMcpEntity)).Methods(http.MethodGet)

	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/documents/{slug}", authenticator.Secure(versionController.GetVersionedDocument)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/documents", authenticator.Secure(versionController.GetVersionDocuments)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/documents/{slug}/shareability", authenticator.Secure(versionController.UpdateDocumentShareability)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/references", authenticator.Secure(versionController.GetVersionReferencesV3)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/sources", authenticator.Secure(publishedController.GetVersionSources)).Methods(http.MethodGet)
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/revisions", authenticator.Secure(versionController.GetVersionRevisionsList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/sourceData", authenticator.Secure(publishedController.GetPublishedVersionSourceDataConfig)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/config", authenticator.Secure(publishedController.GetPublishedVersionBuildConfig)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/copy", authenticator.Secure(versionController.CopyVersion)).Methods(http.MethodPost)

	r.HandleFunc("/api/v4/packages/{packageId}/activity", authenticator.Secure(activityTrackingController.GetActivityHistoryForPackage)).Methods(http.MethodGet)
	r.HandleFunc("/api/v4/activity", authenticator.Secure(activityTrackingController.GetActivityHistory)).Methods(http.MethodGet)

	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/groups", authenticator.Secure(operationGroupController.CreateOperationGroup)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}", authenticator.Secure(operationGroupController.DeleteOperationGroup)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}", authenticator.Secure(operationGroupController.GetGroupedOperations)).Methods(http.MethodGet)
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}", authenticator.Secure(operationGroupController.UpdateOperationGroup)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}/template", authenticator.Secure(operationGroupController.GetGroupExportTemplate)).Methods(http.MethodGet)

	r.HandleFunc("/playground/proxy", authenticator.SecureProxy(playgroundProxyController.Proxy))

	r.HandleFunc("/api/v2/admins", authenticator.Secure(sysAdminController.GetSystemAdministrators)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/admins", authenticator.Secure(sysAdminController.AddSystemAdministrator)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/admins/{userId}", authenticator.Secure(sysAdminController.DeleteSystemAdministrator)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v2/permissions", authenticator.Secure(roleController.GetExistingPermissions)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/roles", authenticator.Secure(roleController.CreateRole)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/roles", authenticator.Secure(roleController.GetExistingRoles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/roles/{roleId}", authenticator.Secure(roleController.UpdateRole)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v2/roles/{roleId}", authenticator.Secure(roleController.DeleteRole)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v2/roles/changeOrder", authenticator.Secure(roleController.SetRoleOrder)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/availableRoles", authenticator.Secure(roleController.GetAvailablePackageRoles)).Methods(http.MethodGet)

	r.HandleFunc("/api/internal/migrate/operations", authenticator.Secure(dataMigrationController.StartOpsMigration)).Methods(http.MethodPost)
	r.HandleFunc("/api/internal/migrate/operations/{migrationId}", authenticator.Secure(dataMigrationController.GetMigrationReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/internal/migrate/operations/{migrationId}/suspiciousBuilds", authenticator.Secure(dataMigrationController.GetSuspiciousBuilds)).Methods(http.MethodGet)
	r.HandleFunc("/api/internal/migrate/operations/{migrationId}/perf", authenticator.Secure(dataMigrationController.GetMigrationPerfReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/internal/migrate/operations/cancel", authenticator.Secure(dataMigrationController.CancelRunningMigrations)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/admin/transition/move", authenticator.Secure(transitionController.MoveOrRenamePackage)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/admin/transition/move/{id}", authenticator.Secure(transitionController.GetMoveStatus)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/admin/transition/activity", authenticator.Secure(transitionController.ListActivities)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/admin/transition", authenticator.Secure(transitionController.ListPackageTransitions)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/builds", authenticator.Secure(buildController.ListBuilds)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/builds/{buildId}", authenticator.Secure(buildController.GetBuild)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/admin/builds/{buildId}/result", authenticator.Secure(buildController.GetBuildResult)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/admin/builds/{buildId}/sources", authenticator.Secure(buildController.GetBuildSources)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/admin/packages/{packageId}/versions/{version}/sources", authenticator.Secure(adminPublishedController.ReplaceVersionSources)).Methods(http.MethodPut)

	r.HandleFunc("/api/v2/admin/system/stats", authenticator.Secure(systemStatsController.GetSystemStats)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/compare", authenticator.Secure(comparisonController.CompareTwoVersions)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/changes/export", authenticator.Secure(exportController.GenerateApiChangesExcelReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/export/changes", authenticator.Secure(exportController.GenerateApiChangesExcelReportV3)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations", authenticator.Secure(exportController.GenerateOperationsExcelReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations/deprecated", authenticator.Secure(exportController.GenerateDeprecatedOperationsExcelReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/export/shareability-report", authenticator.Secure(exportController.GenerateShareabilityReport)).Methods(http.MethodGet)

	r.Path("/metrics").Handler(promhttp.Handler())
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/build/groups/{groupName}/buildType/{buildType}", authenticator.Secure(transformationController.TransformDocuments_deprecated_2)).Methods(http.MethodPost)             //deprecated
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/export/groups/{groupName}/buildType/{buildType}", authenticator.Secure(exportController.ExportOperationGroupAsOpenAPIDocuments_deprecated_2)).Methods(http.MethodGet) //deprecated
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}/documents", authenticator.Secure(transformationController.GetDataForDocumentsTransformation)).Methods(http.MethodGet)

	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}/publish", authenticator.Secure(operationGroupController.StartOperationGroupPublish)).Methods(http.MethodPost)
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}/publish/{publishId}/status", authenticator.Secure(operationGroupController.GetOperationGroupPublishStatus)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/businessMetrics", authenticator.Secure(businessMetricController.GetBusinessMetrics)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/publishHistory", authenticator.Secure(versionController.GetPublishedVersionsHistory)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/personalAccessToken", authenticator.Secure(personalAccessTokenController.CreatePAT)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/personalAccessToken", authenticator.Secure(personalAccessTokenController.ListPATs)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/personalAccessToken/{id}", authenticator.Secure(personalAccessTokenController.DeletePAT)).Methods(http.MethodDelete)

	r.HandleFunc("/api/v1/packages/{packageId}/exportConfig", authenticator.Secure(packageExportConfigController.GetConfig)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/exportConfig", authenticator.Secure(packageExportConfigController.SetConfig)).Methods(http.MethodPatch)

	r.HandleFunc("/api/v1/export", authenticator.Secure(exportController.StartAsyncExport)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/export/{exportId}/status", authenticator.Secure(exportController.GetAsyncExportStatus)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/deleted/packages", authenticator.Secure(packageController.GetDeletedPackagesList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/deleted/packages/{packageId}/versions", authenticator.Secure(versionController.GetDeletedPackageVersionsList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/deleted/packages/{packageId}/versions/{version}", authenticator.Secure(versionController.GetDeletedPackageVersionContent)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/version-internal-documents", authenticator.Secure(internalDocsController.GetVersionInternalDocuments)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/version-internal-documents/{hash}", authenticator.Secure(internalDocsController.GetVersionInternalDocumentData)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/comparison-internal-documents", authenticator.Secure(internalDocsController.GetComparisonInternalDocuments)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/comparison-internal-documents/{hash}", authenticator.Secure(internalDocsController.GetComparisonInternalDocumentData)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/shareability/bulk-update", authenticator.Secure(versionController.BulkUpdateDocumentShareability)).Methods(http.MethodPost)

	//debug + cleanup
	if !systemInfoService.GetSystemInfo().ProductionMode {
		r.HandleFunc("/api/internal/users/{userId}/systemRole", authenticator.Secure(roleController.TestSetUserSystemRole)).Methods(http.MethodPost)
		r.HandleFunc("/api/internal/users", authenticator.NoSecure(userController.CreateInternalUser)).Methods(http.MethodPost)
		r.HandleFunc("/api/v2/auth/local", authenticator.NoSecure(authenticator.CreateLocalUserToken_deprecated)).Methods(http.MethodPost) //deprecated
		r.HandleFunc("/api/v3/auth/local", authenticator.NoSecure(authenticator.CreateLocalUserToken)).Methods(http.MethodPost)
		r.HandleFunc("/api/v3/auth/local/refresh", authenticator.RefreshToken(responder.RedirectHandler(systemInfoService.GetAPIHubUrl()))).Methods(http.MethodGet)

		r.HandleFunc("/api/internal/clear/{testId}", authenticator.Secure(cleanupController.ClearTestData)).Methods(http.MethodDelete)

		r.PathPrefix("/debug/").Handler(http.DefaultServeMux)

		r.HandleFunc("/api/internal/minio/download", authenticator.Secure(minioStorageController.DownloadFilesFromMinioToDatabase)).Methods(http.MethodPost)
	}

	r.HandleFunc("/api/v1/ephemeral-files/{fileId}", authenticator.NoSecure(ephemeralFileController.Download)).Methods(http.MethodGet)

	if aiChatEnabled {
		r.HandleFunc("/api/v1/ai-chat/chats", authenticator.Secure(aiChatController.ListChats)).Methods(http.MethodGet)
		r.HandleFunc("/api/v1/ai-chat/chats", authenticator.Secure(aiChatController.CreateChat)).Methods(http.MethodPost)
		r.HandleFunc("/api/v1/ai-chat/chats/{chatId}", authenticator.Secure(aiChatController.GetChat)).Methods(http.MethodGet)
		r.HandleFunc("/api/v1/ai-chat/chats/{chatId}", authenticator.Secure(aiChatController.UpdateChat)).Methods(http.MethodPatch)
		r.HandleFunc("/api/v1/ai-chat/chats/{chatId}", authenticator.Secure(aiChatController.DeleteChat)).Methods(http.MethodDelete)
		r.HandleFunc("/api/v1/ai-chat/chats/{chatId}/messages", authenticator.Secure(aiChatController.ListMessages)).Methods(http.MethodGet)
		r.HandleFunc("/api/v1/ai-chat/chats/{chatId}/messages", authenticator.Secure(aiChatController.SendMessage)).Methods(http.MethodPost)
		r.HandleFunc("/api/v1/ai-chat/chats/{chatId}/messages/stream", authenticator.Secure(aiChatController.SendMessageStream)).Methods(http.MethodPost)
	}

	mcpHandler := mcpController.MakeMCPServer()
	// The MCP transport request is deliberately exempt from RequestTimeoutMiddleware: it is a
	// long-lived stream that carries many tool calls. The DB work is bounded per tool call by
	// service.MCPToolCallTimeout instead.
	r.Handle("/api/v1/mcp/", authenticator.SecureMCP(mcpHandler))

	discoveryConfig := config.DiscoveryConfig{
		ScanDirectory: systemInfoService.GetApiSpecDirectory(),
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

	portalFs := http.FileServer(http.Dir(basePath + "/static/portal"))

	knownPathPrefixes := []string{
		"/api/",
		"/v3/",
		"/login/",
		"/playground/",
		"/saml/",
		"/ws/",
		"/metrics",
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

			responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusMisdirectedRequest,
				Message: "Requested unknown endpoint",
			})
		})
	}

	r.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO: return not implemented if request matches /api /ws
		w.Header().Add("Cache-Control", "max-age=57600") // 16h
		if r.URL.Path != "/" {
			fullPath := basePath + "/static/portal/" + strings.TrimPrefix(path.Clean(r.URL.Path), "/")
			_, err := os.Stat(fullPath)
			if err != nil { // Redirect unknown requests to frontend
				r.URL.Path = "/"
			}
			portalFs.ServeHTTP(w, r)
		} else {
			portalFs.ServeHTTP(w, r) // portal is default app
		}
	})

	srv := makeServer(systemInfoService, r)

	utils.SafeAsync(func() {
		zeroDayCtx, cancel := context.WithTimeout(context.Background(), startupOperationTimeout)
		defer cancel()
		if err := zeroDayAdminService.CreateZeroDayAdmin(zeroDayCtx); err != nil {
			log.Errorf("Failed to create zero day admin user: %s", err)
		}

		apiKeyCtx, apiKeyCancel := context.WithTimeout(context.Background(), startupOperationTimeout)
		defer apiKeyCancel()
		if err := apihubApiKeyService.CreateSystemApiKey(apiKeyCtx); err != nil {
			log.Errorf("Failed to create system api key: %s", err)
		}
	})

	if systemInfoService.MonitoringEnabled() {
		utils.SafeAsync(func() {
			metrics.RegisterAllPrometheusApplicationMetrics()
		})
	}

	if systemInfoService.IsMinioStorageActive() {
		utils.SafeAsync(func() {
			minioStorageService.UploadFilesToBucket()
		})
	}

	utils.SafeAsync(func() {
		exportService.StartCleanupOldResultsJob(context.Background())
	})

	dbMigrationService.StartOpsMigrationRestoreProc(context.Background())

	log.Fatalf("Http server returned error: %v", srv.ListenAndServe())
}

func isAiChatEnabled(sis service.SystemInfoService) bool {
	return sis.GetAiChatConfig().Enabled
}

func makeServer(systemInfoService service.SystemInfoService, r *mux.Router) *http.Server {
	listenAddr := systemInfoService.GetListenAddress()

	log.Infof("Listen addr = %s", listenAddr)

	var corsOptions []handlers.CORSOption

	corsOptions = append(corsOptions, handlers.AllowedHeaders([]string{"Connection", "Accept-Encoding", "Content-Encoding", "X-Requested-With", "Content-Type", "Authorization"}))

	allowedOrigins := systemInfoService.GetAllowedOrigins()
	if len(allowedOrigins) > 0 {
		corsOptions = append(corsOptions, handlers.AllowedOrigins(allowedOrigins))
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
	//   - http.ResponseController.SetWriteDeadline per-request (see middleware/WriteDeadlineMiddleware.go) to set
	//     a deadline only on the response writing phase, independent of processing time.
	//   - A request-context deadline for processing time control (see middleware/RequestTimeoutMiddleware.go),
	//     configured via technicalParameters.requestTimeoutSec.
	corsHandler := handlers.CORS(corsOptions...)(r)
	compressedHandler := handlers.CompressHandler(corsHandler)
	handler := midldleware.NewSelectiveCompressionHandler(corsHandler, compressedHandler)

	return &http.Server{
		Handler:     handler,
		Addr:        listenAddr,
		ReadTimeout: 60 * time.Second,
	}
}
