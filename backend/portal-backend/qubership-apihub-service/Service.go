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
	"io"
	"net/http"
	_ "net/http/pprof"
	"os"
	"path"
	"runtime/debug"
	"strings"
	"sync"
	"time"

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

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/controller"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"

	"github.com/Netcracker/qubership-apihub-commons-go/api-spec-exposer"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
	prefixed "github.com/x-cray/logrus-prefixed-formatter"
)

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
	basePath := systemInfoService.GetBasePath()

	// Create router and server to expose live and ready endpoints during initialization
	readyChan := make(chan bool)
	migrationPassedChan := make(chan bool)
	initSrvStoppedChan := make(chan bool)
	r := mux.NewRouter()
	// r.Use(midldleware.PrometheusMiddleware) todo figure out why breaks streaming
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
	minioStorageService := service.NewMinioStorageService(buildResultRepository, publishedRepository, minioStorageCreds)
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

	packageVersionEnrichmentService := service.NewPackageVersionEnrichmentService(publishedRepository)
	activityTrackingService := service.NewActivityTrackingService(activityTrackingRepository, publishedRepository, userService)
	operationService := service.NewOperationService(operationRepository, publishedRepository, packageVersionEnrichmentService)
	roleService := service.NewRoleService(roleRepository, userService, activityTrackingService, publishedRepository)
	ptHandler := service.NewPackageTransitionHandler(transitionRepository)
	publishNotificationService := service.NewPublishNotificationService(olricProvider)
	publishedService := service.NewPublishedService(publishedRepository, buildRepository, favoritesRepository, operationRepository, activityTrackingService, monitoringService, minioStorageService, systemInfoService, publishNotificationService)
	portalService := service.NewPortalService(basePath, publishedService, publishedRepository)

	operationGroupService := service.NewOperationGroupService(operationRepository, publishedRepository, exportRepository, packageVersionEnrichmentService, activityTrackingService)
	versionService := service.NewVersionService(favoritesRepository, publishedRepository, publishedService, operationRepository, exportRepository, operationService, activityTrackingService, systemInfoService, packageVersionEnrichmentService, portalService, versionCleanupRepository, operationGroupService, monitoringService)
	packageService := service.NewPackageService(favoritesRepository, publishedRepository, versionService, roleService, activityTrackingService, monitoringService, operationGroupService, usersRepository, ptHandler, systemInfoService)

	logsService := service.NewLogsService()
	apihubApiKeyService := service.NewApihubApiKeyService(apihubApiKeyRepository, publishedRepository, activityTrackingService, userService, roleRepository, roleService.IsSysadm, systemInfoService)

	refResolverService := service.NewRefResolverService(publishedRepository)
	buildProcessorService := service.NewBuildProcessorService(buildRepository, refResolverService)
	buildService := service.NewBuildService(buildRepository, buildProcessorService, publishedService, systemInfoService, packageService, refResolverService)

	packageExportConfigService := service.NewPackageExportConfigService(packageExportConfigRepository, packageService)

	exportService := service.NewExportService(exportRepository, buildService, packageExportConfigService)

	buildResultService := service.NewBuildResultService(buildResultRepository, buildRepository, publishedRepository, systemInfoService, minioStorageService, publishedService, exportService)
	versionService.SetBuildService(buildService)
	operationGroupService.SetBuildService(buildService)

	excelService := service.NewExcelService(publishedRepository, versionService, operationService, packageService)
	comparisonService := service.NewComparisonService(publishedRepository, operationRepository, packageVersionEnrichmentService)
	businessMetricService := service.NewBusinessMetricService(businessMetricRepository)

	dbCleanupService := service.NewDBCleanupService(buildCleanupRepository, migrationRunRepository, minioStorageService, systemInfoService)
	if err := dbCleanupService.CreateCleanupJob(systemInfoService.GetBuildsCleanupSchedule()); err != nil {
		log.Error("Failed to start cleaning job" + err.Error())
	}

	transitionService := service.NewTransitionService(transitionRepository, publishedRepository)
	transformationService := service.NewTransformationService(publishedRepository, operationRepository, packageVersionEnrichmentService)

	zeroDayAdminService := service.NewZeroDayAdminService(userService, roleService, usersRepository, systemInfoService)

	personalAccessTokenService := service.NewPersonalAccessTokenService(personalAccessTokenRepository, userService, roleService)

	tokenRevocationService := service.NewTokenRevocationService(olricProvider, systemInfoService.GetRefreshTokenDurationSec())
	systemStatsService := service.NewSystemStatsService(systemStatsRepository)

	mcpService := service.NewMCPService(systemInfoService, operationService, packageService)
	chatService := service.NewChatService(systemInfoService, mcpService)

	idpManager, err := providers.NewIDPManager(systemInfoService.GetAuthConfig(), systemInfoService.GetAllowedHosts(), systemInfoService.IsProductionMode(), userService)
	if err != nil {
		log.Error("Failed to initialize external IDP: " + err.Error())
		panic("Failed to initialize external IDP: " + err.Error())
	}

	publishedController := controller.NewPublishedController(publishedService, portalService)

	logsController := controller.NewLogsController(logsService, roleService)
	systemInfoController := controller.NewSystemInfoController(systemInfoService, dbMigrationService)
	sysAdminController := controller.NewSysAdminController(roleService)
	apihubApiKeyController := controller.NewApihubApiKeyController(apihubApiKeyService, roleService)
	cleanupController := controller.NewCleanupController(cleanupService)

	playgroundProxyController := controller.NewPlaygroundProxyController(systemInfoService)
	publishV2Controller := controller.NewPublishV2Controller(buildService, publishedService, buildResultService, roleService, systemInfoService)
	exportController := controller.NewExportController(publishedService, portalService, roleService, excelService, versionService, monitoringService, exportService, packageService)

	packageController := controller.NewPackageController(packageService, publishedService, portalService, roleService, monitoringService, ptHandler)
	versionController := controller.NewVersionController(versionService, roleService, monitoringService, ptHandler, roleService.IsSysadm)
	roleController := controller.NewRoleController(roleService)
	samlAuthController := controller.NewSamlAuthController(userService, systemInfoService, idpManager) //deprecated
	authController := controller.NewAuthController(systemInfoService, idpManager)
	userController := controller.NewUserController(userService, privateUserPackageService, roleService)
	jwtPubKeyController := controller.NewJwtPubKeyController()
	logoutController := controller.NewLogoutController(tokenRevocationService, systemInfoService)
	operationController := controller.NewOperationController(roleService, operationService, buildService, monitoringService, ptHandler)
	operationGroupController := controller.NewOperationGroupController(roleService, operationGroupService, versionService)
	searchController := controller.NewSearchController(operationService, versionService, monitoringService)
	dataMigrationController := mController.NewTempMigrationController(dbMigrationService, roleService.IsSysadm)
	activityTrackingController := controller.NewActivityTrackingController(activityTrackingService, roleService, ptHandler)
	comparisonController := controller.NewComparisonController(operationService, versionService, buildService, roleService, comparisonService, monitoringService, ptHandler)
	transitionController := controller.NewTransitionController(transitionService, roleService.IsSysadm)
	businessMetricController := controller.NewBusinessMetricController(businessMetricService, excelService, roleService.IsSysadm)
	transformationController := controller.NewTransformationController(roleService, buildService, versionService, transformationService, operationGroupService)
	minioStorageController := controller.NewMinioStorageController(minioStorageCreds, minioStorageService, roleService)
	personalAccessTokenController := controller.NewPersonalAccessTokenController(personalAccessTokenService)
	packageExportConfigController := controller.NewPackageExportConfigController(roleService, packageExportConfigService, ptHandler)
	systemStatsController := controller.NewSystemStatsController(systemStatsService, roleService)
	internalDocsController := controller.NewInternalDocumentController(publishedService, roleService)
	mcpController := controller.NewMCPController(mcpService)
	chatController := controller.NewChatController(chatService)
	buildController := controller.NewBuildController(buildResultService, buildService, roleService.IsSysadm)

	r.HandleFunc("/api/v1/system/info", security.Secure(systemInfoController.GetSystemInfo)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/system/configuration", samlAuthController.GetSystemSSOInfo_deprecated).Methods(http.MethodGet) //deprecated
	r.HandleFunc("/api/v2/system/configuration", security.NoSecure(authController.GetSystemConfigurationInfo)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/debug/logs", security.Secure(logsController.StoreLogs)).Methods(http.MethodPut)
	r.HandleFunc("/api/v1/debug/logs/setLevel", security.Secure(logsController.SetLogLevel)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/debug/logs/checkLevel", security.Secure(logsController.CheckLogLevel)).Methods(http.MethodGet)

	//Search
	r.HandleFunc("/api/v3/search/{searchLevel}", security.Secure(searchController.Search)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/builders/{builderId}/tasks", security.Secure(publishV2Controller.GetFreeBuild)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/packages", security.Secure(packageController.CreatePackage)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}", security.Secure(packageController.UpdatePackage)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v2/packages/{packageId}", security.Secure(packageController.DeletePackage)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v2/packages/{packageId}/favor", security.Secure(packageController.FavorPackage)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/disfavor", security.Secure(packageController.DisfavorPackage)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}", security.Secure(packageController.GetPackage)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/status", security.Secure(packageController.GetPackageStatus)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages", security.Secure(packageController.GetPackagesList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/publish/availableStatuses", security.Secure(packageController.GetAvailableVersionStatusesForPublish_deprecated)).Methods(http.MethodGet) // deprecated

	r.HandleFunc("/api/v4/packages/{packageId}/apiKeys", security.Secure(apihubApiKeyController.GetApiKeys)).Methods(http.MethodGet)
	r.HandleFunc("/api/v4/packages/{packageId}/apiKeys", security.Secure(apihubApiKeyController.CreateApiKey)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/apiKeys/{id}", security.Secure(apihubApiKeyController.RevokeApiKey)).Methods(http.MethodDelete)

	r.HandleFunc("/api/v2/packages/{packageId}/members", security.Secure(roleController.GetPackageMembers)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/members", security.Secure(roleController.AddPackageMembers)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/members/{userId}", security.Secure(roleController.UpdatePackageMembers)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v2/packages/{packageId}/members/{userId}", security.Secure(roleController.DeletePackageMember)).Methods(http.MethodDelete)

	r.HandleFunc("/api/v2/packages/{packageId}/recalculateGroups", security.Secure(packageController.RecalculateOperationGroups)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/calculateGroups", security.Secure(packageController.CalculateOperationGroups)).Methods(http.MethodGet)

	//api for extensions
	r.HandleFunc("/api/v2/users/{userId}/availablePackagePromoteStatuses", security.Secure(roleController.GetAvailableUserPackagePromoteStatuses)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/packages/{packageId}/publish/{publishId}/status", security.Secure(publishV2Controller.GetPublishStatus)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/publish/statuses", security.Secure(publishV2Controller.GetPublishStatuses)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/publish", security.Secure(publishV2Controller.Publish)).Methods(http.MethodPost)
	r.HandleFunc("/api/v3/packages/{packageId}/publish/{publishId}/status", security.Secure(publishV2Controller.SetPublishStatus)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/packages/{packageId}/publish/withOperationsGroup", security.Secure(versionController.PublishFromCSV)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/packages/{packageId}/publish/{publishId}/withOperationsGroup/status", security.Secure(versionController.GetCSVDashboardPublishStatus)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/publish/{publishId}/withOperationsGroup/report", security.Secure(versionController.GetCSVDashboardPublishReport)).Methods(http.MethodGet)

	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}", security.Secure(versionController.GetPackageVersionContent)).Methods(http.MethodGet)
	r.HandleFunc("/api/v3/packages/{packageId}/versions", security.Secure(versionController.GetPackageVersionsList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}", security.Secure(versionController.DeleteVersion)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}", security.Secure(versionController.PatchVersion)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/recursiveDelete", security.Secure(versionController.DeleteVersionsRecursively)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/files/{slug}/raw", security.Secure(versionController.GetVersionedContentFileRaw)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/sharedFiles/{sharedFileId}", security.NoSecure(versionController.GetSharedContentFile)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/changes", security.Secure(versionController.GetVersionChanges_deprecated)).Methods(http.MethodGet)   // deprecated
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/problems", security.Secure(versionController.GetVersionProblems_deprecated)).Methods(http.MethodGet) // deprecated
	r.HandleFunc("/api/v2/sharedFiles", security.Secure(versionController.SharePublishedFile)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/doc", security.Secure(exportController.GenerateVersionDoc)).Methods(http.MethodGet)           // deprecated
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/files/{slug}/doc", security.Secure(exportController.GenerateFileDoc)).Methods(http.MethodGet) // deprecated

	r.HandleFunc("/api/v2/auth/saml", security.NoSecure(samlAuthController.StartSamlAuthentication_deprecated)).Methods(http.MethodGet)   // deprecated
	r.HandleFunc("/login/sso/saml", security.RefreshToken(samlAuthController.StartSamlAuthentication_deprecated)).Methods(http.MethodGet) // deprecated
	r.HandleFunc("/saml/acs", security.NoSecure(samlAuthController.AssertionConsumerHandler_deprecated)).Methods(http.MethodPost)
	r.HandleFunc("/saml/metadata", security.NoSecure(samlAuthController.ServeMetadata_deprecated)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/login/sso/{idpId}", security.RefreshToken(authController.StartAuthentication)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/saml/{idpId}/acs", security.NoSecure(authController.SAMLAssertionConsumerHandler)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/saml/{idpId}/metadata", security.NoSecure(authController.ServeMetadata)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/oidc/{idpId}/callback", authController.OIDCCallbackHandler).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/logout", security.SecureJWT(logoutController.Logout)).Methods(http.MethodPost)

	// Required for agent to verify apihub tokens
	r.HandleFunc("/api/v2/auth/publicKey", security.NoSecure(jwtPubKeyController.GetRsaPublicKey)).Methods(http.MethodGet)
	// Required to verify api key for external authorization
	r.HandleFunc("/api/v2/auth/apiKey", security.NoSecure(apihubApiKeyController.GetApiKeyByKey)).Methods(http.MethodGet)
	// Required to verify PAT for external authorization
	r.HandleFunc("/api/v2/auth/pat", security.NoSecure(personalAccessTokenController.GetPatByPat)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/auth/apiKey/{apiKeyId}", security.Secure(apihubApiKeyController.GetApiKeyById)).Methods(http.MethodGet)
	// Required for extensions to check Apihub auth. Just return 200 OK if authentication is passed.
	r.HandleFunc("/api/v1/auth/token", security.SecureJWT(func(writer http.ResponseWriter, request *http.Request) {})).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/users/{userId}/profile/avatar", security.NoSecure(userController.GetUserAvatar)).Methods(http.MethodGet) // Should not be secured! FE renders avatar as <img src='avatarUrl' and it couldn't include auth header
	r.HandleFunc("/api/v2/users", security.Secure(userController.GetUsers)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/users/{userId}", security.Secure(userController.GetUserById)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/users/{userId}/space", security.Secure(userController.CreatePrivatePackageForUser)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/space", security.SecureUser(userController.CreatePrivateUserPackage)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/space", security.SecureUser(userController.GetPrivateUserPackage)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/user", security.SecureUser(userController.GetExtendedUser_deprecated)).Methods(http.MethodGet) //deprecated
	r.HandleFunc("/api/v2/user", security.SecureUser(userController.GetExtendedUser)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/changes/summary", security.Secure(comparisonController.GetComparisonChangesSummary)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations", security.Secure(operationController.GetOperationList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations/{operationId}", security.Secure(operationController.GetOperation)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations/{operationId}/changes", security.Secure(operationController.GetOperationChanges)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations/{operationId}/models/{modelName}/usages", security.Secure(operationController.GetOperationModelUsages)).Methods(http.MethodGet)
	r.HandleFunc("/api/v4/packages/{packageId}/versions/{version}/{apiType}/changes", security.Secure(operationController.GetOperationsChanges)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/tags", security.Secure(operationController.GetOperationsTags)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/deprecated", security.Secure(operationController.GetDeprecatedOperationsList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations/{operationId}/deprecatedItems", security.Secure(operationController.GetOperationDeprecatedItems)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/deprecated/summary", security.Secure(operationController.GetDeprecatedOperationsSummary)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/operations/{operationId}/changes/summary", security.Secure(operationController.GetOperationChangesSummary)).Methods(http.MethodGet)

	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/documents/{slug}", security.Secure(versionController.GetVersionedDocument)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/documents", security.Secure(versionController.GetVersionDocuments)).Methods(http.MethodGet)
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/references", security.Secure(versionController.GetVersionReferencesV3)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/sources", security.Secure(publishedController.GetVersionSources)).Methods(http.MethodGet)
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/revisions", security.Secure(versionController.GetVersionRevisionsList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/sourceData", security.Secure(publishedController.GetPublishedVersionSourceDataConfig)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/config", security.Secure(publishedController.GetPublishedVersionBuildConfig)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/copy", security.Secure(versionController.CopyVersion)).Methods(http.MethodPost)

	r.HandleFunc("/api/v4/packages/{packageId}/activity", security.Secure(activityTrackingController.GetActivityHistoryForPackage)).Methods(http.MethodGet)
	r.HandleFunc("/api/v4/activity", security.Secure(activityTrackingController.GetActivityHistory)).Methods(http.MethodGet)

	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/groups", security.Secure(operationGroupController.CreateOperationGroup)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}", security.Secure(operationGroupController.DeleteOperationGroup)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}", security.Secure(operationGroupController.GetGroupedOperations)).Methods(http.MethodGet)
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}", security.Secure(operationGroupController.UpdateOperationGroup)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}/template", security.Secure(operationGroupController.GetGroupExportTemplate)).Methods(http.MethodGet)

	r.HandleFunc("/playground/proxy", security.SecureProxy(playgroundProxyController.Proxy))

	r.HandleFunc("/api/v2/admins", security.Secure(sysAdminController.GetSystemAdministrators)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/admins", security.Secure(sysAdminController.AddSystemAdministrator)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/admins/{userId}", security.Secure(sysAdminController.DeleteSystemAdministrator)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v2/permissions", security.Secure(roleController.GetExistingPermissions)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/roles", security.Secure(roleController.CreateRole)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/roles", security.Secure(roleController.GetExistingRoles)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/roles/{roleId}", security.Secure(roleController.UpdateRole)).Methods(http.MethodPatch)
	r.HandleFunc("/api/v2/roles/{roleId}", security.Secure(roleController.DeleteRole)).Methods(http.MethodDelete)
	r.HandleFunc("/api/v2/roles/changeOrder", security.Secure(roleController.SetRoleOrder)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/packages/{packageId}/availableRoles", security.Secure(roleController.GetAvailablePackageRoles)).Methods(http.MethodGet)

	r.HandleFunc("/api/internal/migrate/operations", security.Secure(dataMigrationController.StartOpsMigration)).Methods(http.MethodPost)
	r.HandleFunc("/api/internal/migrate/operations/{migrationId}", security.Secure(dataMigrationController.GetMigrationReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/internal/migrate/operations/{migrationId}/suspiciousBuilds", security.Secure(dataMigrationController.GetSuspiciousBuilds)).Methods(http.MethodGet)
	r.HandleFunc("/api/internal/migrate/operations/{migrationId}/perf", security.Secure(dataMigrationController.GetMigrationPerfReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/internal/migrate/operations/cancel", security.Secure(dataMigrationController.CancelRunningMigrations)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/admin/transition/move", security.Secure(transitionController.MoveOrRenamePackage)).Methods(http.MethodPost)
	r.HandleFunc("/api/v2/admin/transition/move/{id}", security.Secure(transitionController.GetMoveStatus)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/admin/transition/activity", security.Secure(transitionController.ListActivities)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/admin/transition", security.Secure(transitionController.ListPackageTransitions)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/admin/builds/{buildId}/result", security.Secure(buildController.GetBuildResult)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/admin/builds/{buildId}/sources", security.Secure(buildController.GetBuildSources)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/admin/system/stats", security.Secure(systemStatsController.GetSystemStats)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/compare", security.Secure(comparisonController.CompareTwoVersions)).Methods(http.MethodPost)

	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/changes/export", security.Secure(exportController.GenerateApiChangesExcelReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/export/changes", security.Secure(exportController.GenerateApiChangesExcelReportV3)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations", security.Secure(exportController.GenerateOperationsExcelReport)).Methods(http.MethodGet)
	r.HandleFunc("/api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations/deprecated", security.Secure(exportController.GenerateDeprecatedOperationsExcelReport)).Methods(http.MethodGet)

	r.Path("/metrics").Handler(promhttp.Handler())
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/build/groups/{groupName}/buildType/{buildType}", security.Secure(transformationController.TransformDocuments_deprecated_2)).Methods(http.MethodPost)             //deprecated
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/export/groups/{groupName}/buildType/{buildType}", security.Secure(exportController.ExportOperationGroupAsOpenAPIDocuments_deprecated_2)).Methods(http.MethodGet) //deprecated
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}/documents", security.Secure(transformationController.GetDataForDocumentsTransformation)).Methods(http.MethodGet)

	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}/publish", security.Secure(operationGroupController.StartOperationGroupPublish)).Methods(http.MethodPost)
	r.HandleFunc("/api/v3/packages/{packageId}/versions/{version}/{apiType}/groups/{groupName}/publish/{publishId}/status", security.Secure(operationGroupController.GetOperationGroupPublishStatus)).Methods(http.MethodGet)

	r.HandleFunc("/api/v2/businessMetrics", security.Secure(businessMetricController.GetBusinessMetrics)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/publishHistory", security.Secure(versionController.GetPublishedVersionsHistory)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/personalAccessToken", security.Secure(personalAccessTokenController.CreatePAT)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/personalAccessToken", security.Secure(personalAccessTokenController.ListPATs)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/personalAccessToken/{id}", security.Secure(personalAccessTokenController.DeletePAT)).Methods(http.MethodDelete)

	r.HandleFunc("/api/v1/packages/{packageId}/exportConfig", security.Secure(packageExportConfigController.GetConfig)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/exportConfig", security.Secure(packageExportConfigController.SetConfig)).Methods(http.MethodPatch)

	r.HandleFunc("/api/v1/export", security.Secure(exportController.StartAsyncExport)).Methods(http.MethodPost)
	r.HandleFunc("/api/v1/export/{exportId}/status", security.Secure(exportController.GetAsyncExportStatus)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/deleted/packages", security.Secure(packageController.GetDeletedPackagesList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/deleted/packages/{packageId}/versions", security.Secure(versionController.GetDeletedPackageVersionsList)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/deleted/packages/{packageId}/versions/{version}", security.Secure(versionController.GetDeletedPackageVersionContent)).Methods(http.MethodGet)

	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/version-internal-documents", security.Secure(internalDocsController.GetVersionInternalDocuments)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/version-internal-documents/{hash}", security.Secure(internalDocsController.GetVersionInternalDocumentData)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/packages/{packageId}/versions/{version}/comparison-internal-documents", security.Secure(internalDocsController.GetComparisonInternalDocuments)).Methods(http.MethodGet)
	r.HandleFunc("/api/v1/comparison-internal-documents/{hash}", security.Secure(internalDocsController.GetComparisonInternalDocumentData)).Methods(http.MethodGet)

	//debug + cleanup
	if !systemInfoService.GetSystemInfo().ProductionMode {
		r.HandleFunc("/api/internal/users/{userId}/systemRole", security.Secure(roleController.TestSetUserSystemRole)).Methods(http.MethodPost)
		r.HandleFunc("/api/internal/users", security.NoSecure(userController.CreateInternalUser)).Methods(http.MethodPost)
		r.HandleFunc("/api/v2/auth/local", security.NoSecure(security.CreateLocalUserToken_deprecated)).Methods(http.MethodPost) //deprecated
		r.HandleFunc("/api/v3/auth/local", security.NoSecure(security.CreateLocalUserToken)).Methods(http.MethodPost)
		r.HandleFunc("/api/v3/auth/local/refresh", security.RefreshToken(utils.RedirectHandler(systemInfoService.GetAPIHubUrl()))).Methods(http.MethodGet)

		r.HandleFunc("/api/internal/clear/{testId}", security.Secure(cleanupController.ClearTestData)).Methods(http.MethodDelete)

		r.PathPrefix("/debug/").Handler(http.DefaultServeMux)

		r.HandleFunc("/api/internal/minio/download", security.Secure(minioStorageController.DownloadFilesFromMinioToDatabase)).Methods(http.MethodPost)

		//Chat
		r.HandleFunc("/api/v1/ai-chat", security.Secure(chatController.Chat)).Methods(http.MethodPost)
		r.HandleFunc("/api/v1/ai-chat/stream", security.Secure(chatController.ChatStream)).Methods(http.MethodPost)
	}

	mcpHandler := mcpController.MakeMCPServer()
	r.Handle("/api/v1/mcp/", security.SecureMCP(mcpHandler))

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
			log.Warnf("Requested unknown endpoint: %v %v", r.Method, r.RequestURI)
			utils.RespondWithCustomError(w, &exception.CustomError{
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

	debug.SetGCPercent(30)

	err = security.SetupGoGuardian(userService, roleService, apihubApiKeyService, personalAccessTokenService, systemInfoService, tokenRevocationService)
	if err != nil {
		log.Fatalf("Can't setup go_guardian. Error - %s", err.Error())
	}
	log.Info("go_guardian was installed")

	srv := makeServer(systemInfoService, r)

	utils.SafeAsync(func() {
		if err := zeroDayAdminService.CreateZeroDayAdmin(); err != nil {
			log.Errorf("Failed to create zero day admin user: %s", err)
		}

		if err := apihubApiKeyService.CreateSystemApiKey(); err != nil {
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
			err := minioStorageService.UploadFilesToBucket()
			if err != nil {
				log.Errorf("MINIO error - %s", err.Error())
			}
		})
	}

	utils.SafeAsync(func() {
		exportService.StartCleanupOldResultsJob()
	})

	dbMigrationService.StartOpsMigrationRestoreProc(context.Background())

	log.Fatalf("Http server returned error: %v", srv.ListenAndServe())
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

	return &http.Server{
		Handler:      handlers.CompressHandler(handlers.CORS(corsOptions...)(r)),
		Addr:         listenAddr,
		WriteTimeout: 300 * time.Second,
		ReadTimeout:  30 * time.Second,
	}
}
