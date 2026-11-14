package service

import (
	"context"
	"net/http"
	"time"

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
}

func NewLibraryVersionService(
	libraryVersionRepository repository.LibraryVersionRepository,
	buildService BuildService,
) LibraryVersionService {
	return libraryVersionServiceImpl{
		libraryVersionRepository: libraryVersionRepository,
		buildService:             buildService,
	}
}

type libraryVersionServiceImpl struct {
	libraryVersionRepository repository.LibraryVersionRepository
	buildService             BuildService
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

func libraryVersionNotFound(libraryId, version string) error {
	return &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.LibraryVersionNotFound,
		Message: exception.LibraryVersionNotFoundMsg,
		Params:  map[string]interface{}{"libraryId": libraryId, "version": version},
	}
}
