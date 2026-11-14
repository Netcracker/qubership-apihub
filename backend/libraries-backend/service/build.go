package service

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"

	log "github.com/sirupsen/logrus"
)

// taskConfigEntry is the name java-task-consumer looks for at the root of a task ZIP.
const taskConfigEntry = "config.json"

// resultReportEntry is the single entry of the result ZIP: jdiff-engine's canonical report.
const resultReportEntry = "report.json"

// maxResultReportSize caps how much of a result entry the service reads into memory. A report for a large
// artifact runs to a few megabytes; this leaves room for that while refusing a ZIP bomb.
const maxResultReportSize = 256 << 20

type BuildService interface {
	// EnqueueApiReport queues the build that inventories one library version and returns its build id. The
	// id doubles as the publishId the worker reports against.
	EnqueueApiReport(ctx context.Context, library entity.LibraryEntity, version string) (string, error)
	// EnqueueApiDiff queues the build that compares two versions of one library. It is what produces a
	// comparison; there is no endpoint that creates one directly.
	EnqueueApiDiff(ctx context.Context, library entity.LibraryEntity, version, previousVersion string) (string, error)
	// GetFreeBuild claims a queued build for a worker and renders it as a task ZIP. It returns nil when
	// there is nothing to do.
	GetFreeBuild(ctx context.Context, builderId string) ([]byte, error)
	// PostStatus records what a worker reports about a build it was handed.
	PostStatus(ctx context.Context, libraryId, publishId, builderId string, status view.BuildStatus, data []byte, buildErrors string) error
}

func NewBuildService(
	buildRepository repository.BuildRepository,
	libraryRepository repository.LibraryRepository,
	libraryVersionRepository repository.LibraryVersionRepository,
	reportIngestService ReportIngestService,
	systemInfoService SystemInfoService,
) BuildService {
	return buildServiceImpl{
		buildRepository:          buildRepository,
		libraryRepository:        libraryRepository,
		libraryVersionRepository: libraryVersionRepository,
		reportIngestService:      reportIngestService,
		systemInfoService:        systemInfoService,
	}
}

type buildServiceImpl struct {
	buildRepository          repository.BuildRepository
	libraryRepository        repository.LibraryRepository
	libraryVersionRepository repository.LibraryVersionRepository
	reportIngestService      ReportIngestService
	systemInfoService        SystemInfoService
}

func (b buildServiceImpl) EnqueueApiReport(ctx context.Context, library entity.LibraryEntity, version string) (string, error) {
	coordinates, err := coordinatesOf(library)
	if err != nil {
		return "", err
	}

	now := time.Now()
	build := entity.BuildEntity{
		BuildId:    newBuildId(),
		Status:     string(view.StatusNotStarted),
		LibraryId:  library.Id,
		Version:    version,
		BuildType:  string(view.BuildTypeJavaApiReport),
		CreatedAt:  now,
		LastActive: now,
		CreatedBy:  secctx.GetUserId(ctx),
		Metadata: map[string]interface{}{
			view.BuildMetadataGav: coordinates.Gav(version),
		},
	}
	if err := b.buildRepository.Create(ctx, build); err != nil {
		return "", fmt.Errorf("failed to queue the API report build for %s %s: %w", library.Id, version, err)
	}
	log.Infof("Queued build %s (%s) for library %s version %s", build.BuildId, build.BuildType, library.Id, version)
	return build.BuildId, nil
}

func (b buildServiceImpl) EnqueueApiDiff(ctx context.Context, library entity.LibraryEntity, version, previousVersion string) (string, error) {
	coordinates, err := coordinatesOf(library)
	if err != nil {
		return "", err
	}

	now := time.Now()
	build := entity.BuildEntity{
		BuildId:    newBuildId(),
		Status:     string(view.StatusNotStarted),
		LibraryId:  library.Id,
		Version:    version,
		BuildType:  string(view.BuildTypeJavaApiDiff),
		CreatedAt:  now,
		LastActive: now,
		CreatedBy:  secctx.GetUserId(ctx),
		Metadata: map[string]interface{}{
			view.BuildMetadataGroupId:    coordinates.GroupId,
			view.BuildMetadataArtifactId: coordinates.ArtifactId,
			view.BuildMetadataOldVersion: previousVersion,
			view.BuildMetadataNewVersion: version,
		},
	}
	if err := b.buildRepository.Create(ctx, build); err != nil {
		return "", fmt.Errorf("failed to queue the API diff build for %s %s against %s: %w",
			library.Id, version, previousVersion, err)
	}
	log.Infof("Queued build %s (%s) for library %s version %s against %s",
		build.BuildId, build.BuildType, library.Id, version, previousVersion)
	return build.BuildId, nil
}

func (b buildServiceImpl) GetFreeBuild(ctx context.Context, builderId string) ([]byte, error) {
	build, err := b.buildRepository.FindAndTakeFreeBuild(ctx, builderId,
		b.systemInfoService.GetBuildKeepaliveTimeout(), b.systemInfoService.GetBuildRestartLimit())
	if err != nil {
		return nil, err
	}
	if build == nil {
		return nil, nil
	}

	taskConfig := view.JavaBuildConfig{
		PublishId: build.BuildId,
		LibraryId: build.LibraryId,
		BuildType: view.BuildType(build.BuildType),
		Metadata:  build.Metadata,
	}
	taskZip, err := makeTaskZip(taskConfig)
	if err != nil {
		// The worker never sees this build; failing it keeps the queue from re-offering a task it cannot
		// render.
		details := fmt.Sprintf("Failed to render the task archive: %v", err)
		if statusErr := b.buildRepository.UpdateStatus(ctx, build.BuildId, view.StatusError, details); statusErr != nil {
			log.Errorf("Failed to mark build %s as failed: %v", build.BuildId, statusErr)
		}
		return nil, err
	}
	log.Debugf("Handed build %s to builder %s", build.BuildId, builderId)
	return taskZip, nil
}

func makeTaskZip(taskConfig view.JavaBuildConfig) ([]byte, error) {
	configBytes, err := json.Marshal(taskConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to encode %s: %w", taskConfigEntry, err)
	}

	result := bytes.Buffer{}
	writer := zip.NewWriter(&result)
	entryWriter, err := writer.Create(taskConfigEntry)
	if err != nil {
		return nil, fmt.Errorf("failed to create %s in the task archive: %w", taskConfigEntry, err)
	}
	if _, err := entryWriter.Write(configBytes); err != nil {
		return nil, fmt.Errorf("failed to write %s to the task archive: %w", taskConfigEntry, err)
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to finish the task archive: %w", err)
	}
	return result.Bytes(), nil
}

func (b buildServiceImpl) PostStatus(ctx context.Context, libraryId, publishId, builderId string, status view.BuildStatus, data []byte, buildErrors string) error {
	build, err := b.buildRepository.Get(ctx, publishId)
	if err != nil {
		return err
	}
	if build == nil || build.LibraryId != libraryId {
		return &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.JavaPublishNotFound,
			Message: exception.JavaPublishNotFoundMsg,
			Params:  map[string]interface{}{"libraryId": libraryId, "publishId": publishId},
		}
	}
	if build.BuilderId != builderId {
		return &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.BuildNotOwned,
			Message: exception.BuildNotOwnedMsg,
			Params:  map[string]interface{}{"publishId": publishId, "builderId": builderId},
		}
	}

	switch status {
	case view.StatusRunning:
		return b.buildRepository.Heartbeat(ctx, publishId)
	case view.StatusError:
		return b.completeWithError(ctx, build, buildErrors)
	case view.StatusComplete:
		return b.complete(ctx, build, data)
	}
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.InvalidBuildStatus,
		Message: exception.InvalidBuildStatusMsg,
		Params:  map[string]interface{}{"status": status},
	}
}

func (b buildServiceImpl) completeWithError(ctx context.Context, build *entity.BuildEntity, buildErrors string) error {
	if err := b.buildRepository.UpdateStatus(ctx, build.BuildId, view.StatusError, buildErrors); err != nil {
		return err
	}
	log.Errorf("Build %s for library %s version %s failed: %s", build.BuildId, build.LibraryId, build.Version, buildErrors)
	return b.setVersionBuildOutcome(ctx, build, view.StatusError, buildErrors)
}

func (b buildServiceImpl) complete(ctx context.Context, build *entity.BuildEntity, data []byte) error {
	if len(data) == 0 {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BuildResultMissing,
			Message: exception.BuildResultMissingMsg,
			Params:  map[string]interface{}{"part": "data", "status": view.StatusComplete},
		}
	}

	report, reportBytes, err := readResultReport(data)
	if err != nil {
		// A result the service cannot read is a build failure, not a successful one: recording it as
		// complete would leave the version permanently empty with no sign of what went wrong.
		details := fmt.Sprintf("Failed to read %s: %v", resultReportEntry, err)
		if statusErr := b.buildRepository.UpdateStatus(ctx, build.BuildId, view.StatusError, details); statusErr != nil {
			log.Errorf("Failed to mark build %s as failed: %v", build.BuildId, statusErr)
		}
		if outcomeErr := b.setVersionBuildOutcome(ctx, build, view.StatusError, details); outcomeErr != nil {
			log.Errorf("Failed to record the outcome of build %s on its version: %v", build.BuildId, outcomeErr)
		}
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidBuildResult,
			Message: exception.InvalidBuildResultMsg,
			Params:  map[string]interface{}{"details": err.Error()},
			Debug:   err.Error(),
		}
	}

	if err := b.buildRepository.StoreResult(ctx, build.BuildId, reportBytes); err != nil {
		return err
	}
	if err := b.reportIngestService.Ingest(ctx, *build, *report); err != nil {
		return err
	}
	if err := b.buildRepository.UpdateStatus(ctx, build.BuildId, view.StatusComplete, ""); err != nil {
		return err
	}
	log.Infof("Build %s populated library %s version %s", build.BuildId, build.LibraryId, build.Version)
	if err := b.setVersionBuildOutcome(ctx, build, view.StatusComplete, ""); err != nil {
		return err
	}
	b.queueFollowUpDiff(ctx, build)
	return nil
}

// queueFollowUpDiff starts the comparison against the version's predecessor once its inventory is in. A
// comparison has no endpoint of its own, so this is what makes the changes sub-resource exist.
//
// A failure here is logged, not returned: the inventory the worker just delivered is valid and recorded,
// and the worker has no way to act on a queueing problem. The missing comparison surfaces as a 404 from the
// changes endpoints, and re-importing the version queues it again.
func (b buildServiceImpl) queueFollowUpDiff(ctx context.Context, build *entity.BuildEntity) {
	if build.BuildType != string(view.BuildTypeJavaApiReport) {
		return
	}

	versionEntity, err := b.libraryVersionRepository.Get(ctx, build.LibraryId, build.Version)
	if err != nil {
		log.Errorf("Failed to read version %s of library %s to queue its comparison: %v", build.Version, build.LibraryId, err)
		return
	}
	if versionEntity == nil || versionEntity.PreviousVersion == "" {
		// The first version of a library has nothing to be compared against.
		return
	}

	library, err := b.libraryRepository.GetById(ctx, build.LibraryId)
	if err != nil {
		log.Errorf("Failed to read library %s to queue the comparison of version %s: %v", build.LibraryId, build.Version, err)
		return
	}
	if library == nil {
		return
	}

	if _, err := b.EnqueueApiDiff(ctx, *library, build.Version, versionEntity.PreviousVersion); err != nil {
		log.Errorf("Failed to queue the comparison of library %s version %s against %s: %v",
			build.LibraryId, build.Version, versionEntity.PreviousVersion, err)
	}
}

// setVersionBuildOutcome records how the build that populates a version ended, so a caller polling the
// version can tell a build still running from one that failed. A completed inventory promotes the version
// out of draft. A comparison build reports only into its own build row: its outcome belongs to the
// comparison, not to the version.
func (b buildServiceImpl) setVersionBuildOutcome(ctx context.Context, build *entity.BuildEntity, status view.BuildStatus, details string) error {
	if build.BuildType != string(view.BuildTypeJavaApiReport) {
		return nil
	}

	versionEntity, err := b.libraryVersionRepository.Get(ctx, build.LibraryId, build.Version)
	if err != nil {
		return err
	}
	if versionEntity == nil {
		// The version was deleted while its build was running; there is nothing left to annotate.
		log.Infof("Build %s finished for a version that no longer exists: %s %s", build.BuildId, build.LibraryId, build.Version)
		return nil
	}

	metadata := versionEntity.Metadata
	if metadata == nil {
		metadata = map[string]interface{}{}
	}
	metadata[view.VersionMetadataBuildId] = build.BuildId
	metadata[view.VersionMetadataBuildStatus] = string(status)
	if details != "" {
		metadata[view.VersionMetadataBuildError] = details
	} else {
		delete(metadata, view.VersionMetadataBuildError)
	}
	if err := b.libraryVersionRepository.SetMetadata(ctx, build.LibraryId, build.Version, metadata); err != nil {
		return err
	}

	if status == view.StatusComplete {
		return b.libraryVersionRepository.SetStatus(ctx, build.LibraryId, build.Version, view.VersionStatusRelease)
	}
	return nil
}

// readResultReport pulls report.json out of the result ZIP and parses it.
func readResultReport(resultZip []byte) (*view.DiffReport, []byte, error) {
	reader, err := zip.NewReader(bytes.NewReader(resultZip), int64(len(resultZip)))
	if err != nil {
		return nil, nil, fmt.Errorf("the result is not a readable ZIP: %w", err)
	}

	for _, file := range reader.File {
		if file.Name != resultReportEntry {
			continue
		}
		entryReader, err := file.Open()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to open %s: %w", resultReportEntry, err)
		}
		defer entryReader.Close()

		reportBytes, err := io.ReadAll(io.LimitReader(entryReader, maxResultReportSize))
		if err != nil {
			return nil, nil, fmt.Errorf("failed to read %s: %w", resultReportEntry, err)
		}

		var report view.DiffReport
		if err := json.Unmarshal(reportBytes, &report); err != nil {
			return nil, nil, fmt.Errorf("failed to parse %s: %w", resultReportEntry, err)
		}
		return &report, reportBytes, nil
	}
	return nil, nil, fmt.Errorf("%s is missing from the result ZIP", resultReportEntry)
}

func coordinatesOf(library entity.LibraryEntity) (view.LibraryCoordinates, error) {
	libraryView := entity.MakeLibraryView(library, false)
	if _, err := libraryView.Coordinates.CoordinatesKey(libraryView.Language); err != nil {
		return view.LibraryCoordinates{}, fmt.Errorf("library %s has coordinates that are not valid for %s: %w",
			library.Id, library.Language, err)
	}
	return libraryView.Coordinates, nil
}
