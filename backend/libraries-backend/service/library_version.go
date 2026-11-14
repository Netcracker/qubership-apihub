package service

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/go-pg/pg/v10"
)

type LibraryVersionService interface {
	// Import registers the version and queues the build that populates it. The version comes back in draft
	// with no content: the build runs asynchronously.
	Import(ctx context.Context, library entity.LibraryEntity, req view.LibraryVersionImportReq) (*view.LibraryVersion, error)
	Get(ctx context.Context, libraryId, version string) (*view.LibraryVersion, error)
	List(ctx context.Context, libraryId string, req view.LibraryVersionListReq) (*view.LibraryVersions, error)
	Delete(ctx context.Context, libraryId, version string) error
	// ListAvailable returns the versions of the library that its registry has and that are not imported
	// yet, newest first, so a caller can pick one to import.
	ListAvailable(ctx context.Context, library entity.LibraryEntity, req view.AvailableVersionListReq) (*view.AvailableVersions, error)
}

func NewLibraryVersionService(
	libraryVersionRepository repository.LibraryVersionRepository,
	buildService BuildService,
	registryService RegistryService,
	registryClient client.RegistryClient,
) LibraryVersionService {
	return libraryVersionServiceImpl{
		libraryVersionRepository: libraryVersionRepository,
		buildService:             buildService,
		registryService:          registryService,
		registryClient:           registryClient,
	}
}

type libraryVersionServiceImpl struct {
	libraryVersionRepository repository.LibraryVersionRepository
	buildService             BuildService
	registryService          RegistryService
	registryClient           client.RegistryClient
}

func (l libraryVersionServiceImpl) Import(ctx context.Context, library entity.LibraryEntity, req view.LibraryVersionImportReq) (*view.LibraryVersion, error) {
	if req.Version == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "version"},
		}
	}
	// Only Java has a build worker. Queuing a task no worker can run would leave the version stuck in
	// draft with no way for the caller to tell why.
	if view.Language(library.Language) != view.LanguageJava {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.LanguageNotSupported,
			Message: exception.LanguageNotSupportedMsg,
			Params:  map[string]interface{}{"language": library.Language, "supported": view.LanguageJava},
		}
	}

	exists, err := l.libraryVersionRepository.Exists(ctx, library.Id, req.Version)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, &exception.CustomError{
			Status:  http.StatusConflict,
			Code:    exception.LibraryVersionAlreadyExists,
			Message: exception.LibraryVersionAlreadyExistsMsg,
			Params:  map[string]interface{}{"libraryId": library.Id, "version": req.Version},
		}
	}

	previousVersion := ""
	previousRelease, err := l.libraryVersionRepository.LatestRelease(ctx, library.Id, req.Version)
	if err != nil {
		return nil, err
	}
	if previousRelease != nil {
		previousVersion = previousRelease.Version
	}

	buildId, err := l.buildService.EnqueueApiReport(ctx, library, req.Version)
	if err != nil {
		return nil, err
	}

	versionEntity := entity.LibraryVersionEntity{
		LibraryId:       library.Id,
		Version:         req.Version,
		PreviousVersion: previousVersion,
		Status:          string(view.VersionStatusDraft),
		Labels:          req.Labels,
		Metadata: map[string]interface{}{
			view.VersionMetadataBuildId:     buildId,
			view.VersionMetadataBuildStatus: string(view.StatusNotStarted),
		},
		CreatedAt: time.Now(),
		CreatedBy: secctx.GetUserId(ctx),
	}
	if err := l.libraryVersionRepository.Upsert(ctx, versionEntity); err != nil {
		return nil, err
	}

	result := entity.MakeLibraryVersionView(versionEntity)
	return &result, nil
}

func (l libraryVersionServiceImpl) Get(ctx context.Context, libraryId, version string) (*view.LibraryVersion, error) {
	ent, err := l.libraryVersionRepository.Get(ctx, libraryId, version)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, libraryVersionNotFound(libraryId, version)
	}
	result := entity.MakeLibraryVersionView(*ent)
	return &result, nil
}

func (l libraryVersionServiceImpl) List(ctx context.Context, libraryId string, req view.LibraryVersionListReq) (*view.LibraryVersions, error) {
	for _, status := range req.Status {
		if !status.Valid() {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.InvalidParameterValue,
				Message: exception.InvalidParameterValueMsg,
				Params:  map[string]interface{}{"value": status, "param": "status"},
			}
		}
	}

	ents, err := l.libraryVersionRepository.List(ctx, libraryId, req)
	if err != nil {
		return nil, err
	}
	result := view.LibraryVersions{Versions: make([]view.LibraryVersion, 0, len(ents))}
	for _, ent := range ents {
		result.Versions = append(result.Versions, entity.MakeLibraryVersionView(ent))
	}
	return &result, nil
}

func (l libraryVersionServiceImpl) Delete(ctx context.Context, libraryId, version string) error {
	err := l.libraryVersionRepository.SoftDelete(ctx, libraryId, version, secctx.GetUserId(ctx))
	if err == pg.ErrNoRows {
		return libraryVersionNotFound(libraryId, version)
	}
	return err
}

func (l libraryVersionServiceImpl) ListAvailable(ctx context.Context, library entity.LibraryEntity, req view.AvailableVersionListReq) (*view.AvailableVersions, error) {
	// Only Java can be imported, and only Maven metadata is read, so other languages are rejected the same
	// way Import rejects them.
	if view.Language(library.Language) != view.LanguageJava {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.LanguageNotSupported,
			Message: exception.LanguageNotSupportedMsg,
			Params:  map[string]interface{}{"language": library.Language, "supported": view.LanguageJava},
		}
	}

	registry, err := l.registryService.RegistryForRepository(ctx, library.Repository)
	if err != nil {
		return nil, err
	}
	if registry == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.RepositoryNotFound,
			Message: exception.RepositoryNotFoundMsg,
			Params:  map[string]interface{}{"repository": library.Repository},
		}
	}

	coordinates := entity.MakeLibraryView(library, false).Coordinates
	registryVersions, err := l.registryClient.ListMavenVersions(ctx, *registry, library.Repository, coordinates.GroupId, coordinates.ArtifactId)
	if err != nil {
		return nil, err
	}
	importedVersions, err := l.libraryVersionRepository.ListVersionNames(ctx, library.Id)
	if err != nil {
		return nil, err
	}

	available := filterAvailableVersions(registryVersions, importedVersions, req.TextFilter)
	result := view.AvailableVersions{Versions: make([]view.AvailableVersion, 0)}
	for _, version := range paginate(available, req.Limit, req.Page) {
		result.Versions = append(result.Versions, view.AvailableVersion{Version: version})
	}
	return &result, nil
}

// filterAvailableVersions drops the imported versions and the ones that do not contain textFilter
// (case-insensitively), and reverses the rest. maven-metadata.xml lists versions in the order they were
// deployed, so the reversed list starts with the newest one.
func filterAvailableVersions(registryVersions, importedVersions []string, textFilter string) []string {
	imported := make(map[string]struct{}, len(importedVersions))
	for _, version := range importedVersions {
		imported[version] = struct{}{}
	}
	filter := strings.ToLower(textFilter)
	result := make([]string, 0, len(registryVersions))
	seen := make(map[string]struct{}, len(registryVersions))
	for i := len(registryVersions) - 1; i >= 0; i-- {
		version := registryVersions[i]
		if _, ok := imported[version]; ok {
			continue
		}
		if _, ok := seen[version]; ok {
			continue
		}
		if filter != "" && !strings.Contains(strings.ToLower(version), filter) {
			continue
		}
		seen[version] = struct{}{}
		result = append(result, version)
	}
	return result
}

func paginate(items []string, limit, page int) []string {
	start := limit * page
	if start >= len(items) {
		return []string{}
	}
	end := start + limit
	if end > len(items) {
		end = len(items)
	}
	return items[start:end]
}

func libraryVersionNotFound(libraryId, version string) error {
	return &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.LibraryVersionNotFound,
		Message: exception.LibraryVersionNotFoundMsg,
		Params:  map[string]interface{}{"libraryId": libraryId, "version": version},
	}
}
