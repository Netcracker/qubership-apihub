package service

import (
	"context"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

// ChangesService serves the stored result of a comparison. It never computes one: a comparison is produced
// by a java-api-diff build, so these reads report 404 until that build has finished.
type ChangesService interface {
	GetSummary(ctx context.Context, libraryId, version, previousLibraryId, previousVersion string) (*view.ChangeSummary, error)
	GetChanges(ctx context.Context, libraryId, version, previousLibraryId, previousVersion string, req view.ChangeListReq) (*view.VersionChanges, error)
}

func NewChangesService(
	comparisonRepository repository.ComparisonRepository,
	libraryVersionRepository repository.LibraryVersionRepository,
) ChangesService {
	return changesServiceImpl{
		comparisonRepository:     comparisonRepository,
		libraryVersionRepository: libraryVersionRepository,
	}
}

type changesServiceImpl struct {
	comparisonRepository     repository.ComparisonRepository
	libraryVersionRepository repository.LibraryVersionRepository
}

func (c changesServiceImpl) GetSummary(ctx context.Context, libraryId, version, previousLibraryId, previousVersion string) (*view.ChangeSummary, error) {
	comparison, err := c.resolve(ctx, libraryId, version, previousLibraryId, previousVersion)
	if err != nil {
		return nil, err
	}
	result := entity.MakeChangeSummaryView(*comparison)
	return &result, nil
}

func (c changesServiceImpl) GetChanges(ctx context.Context, libraryId, version, previousLibraryId, previousVersion string, req view.ChangeListReq) (*view.VersionChanges, error) {
	for _, severity := range req.Severity {
		if !severity.Valid() {
			return nil, invalidParameter("severity", severity)
		}
	}
	for _, changeType := range req.ChangeType {
		if !changeType.Valid() {
			return nil, invalidParameter("changeType", changeType)
		}
	}

	comparison, err := c.resolve(ctx, libraryId, version, previousLibraryId, previousVersion)
	if err != nil {
		return nil, err
	}

	changeEnts, err := c.comparisonRepository.ListChanges(ctx, comparison.ComparisonId, req)
	if err != nil {
		return nil, err
	}

	result := view.VersionChanges{
		Comparison: entity.MakeChangeSummaryView(*comparison),
		Changes:    make([]view.Change, 0, len(changeEnts)),
	}
	for _, changeEnt := range changeEnts {
		result.Changes = append(result.Changes, entity.MakeChangeView(changeEnt))
	}
	return &result, nil
}

// resolve completes the comparison key the caller gave. An unspecified previous library means this library,
// and an unspecified previous version means the version's own predecessor, matching portal-backend's
// previousVersion / previousVersionPackageId convention.
func (c changesServiceImpl) resolve(ctx context.Context, libraryId, version, previousLibraryId, previousVersion string) (*entity.LibraryVersionComparisonEntity, error) {
	versionEntity, err := c.libraryVersionRepository.Get(ctx, libraryId, version)
	if err != nil {
		return nil, err
	}
	if versionEntity == nil {
		return nil, libraryVersionNotFound(libraryId, version)
	}

	if previousLibraryId == "" {
		previousLibraryId = libraryId
	}
	if previousVersion == "" {
		previousVersion = versionEntity.PreviousVersion
	}
	if previousVersion == "" {
		return nil, comparisonNotFound()
	}

	comparison, err := c.comparisonRepository.Get(ctx, view.ComparisonKey{
		LibraryId:         libraryId,
		Version:           version,
		PreviousLibraryId: previousLibraryId,
		PreviousVersion:   previousVersion,
	})
	if err != nil {
		return nil, err
	}
	if comparison == nil {
		return nil, comparisonNotFound()
	}
	return comparison, nil
}

func comparisonNotFound() error {
	return &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.LibraryComparisonNotFound,
		Message: exception.LibraryComparisonNotFoundMsg,
	}
}

func invalidParameter(param string, value interface{}) error {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.InvalidParameterValue,
		Message: exception.InvalidParameterValueMsg,
		Params:  map[string]interface{}{"value": value, "param": param},
	}
}
