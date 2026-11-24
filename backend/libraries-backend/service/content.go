package service

import (
	"context"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

// ContentService reads the parsed API inventory of one library version. A version whose build has not
// finished yet exists but has no classes, so its list comes back empty rather than as an error.
type ContentService interface {
	ListClasses(ctx context.Context, libraryId, version string, req view.LibraryClassListReq) (*view.LibraryClasses, error)
	GetClass(ctx context.Context, libraryId, version, classId string) (*view.LibraryClassDetails, error)
}

func NewContentService(
	contentRepository repository.LibraryContentRepository,
	libraryVersionRepository repository.LibraryVersionRepository,
) ContentService {
	return contentServiceImpl{
		contentRepository:        contentRepository,
		libraryVersionRepository: libraryVersionRepository,
	}
}

type contentServiceImpl struct {
	contentRepository        repository.LibraryContentRepository
	libraryVersionRepository repository.LibraryVersionRepository
}

func (c contentServiceImpl) ListClasses(ctx context.Context, libraryId, version string, req view.LibraryClassListReq) (*view.LibraryClasses, error) {
	for _, kind := range req.Kind {
		if !kind.Valid() {
			return nil, invalidParameter("kind", kind)
		}
	}
	if err := c.checkVersionExists(ctx, libraryId, version); err != nil {
		return nil, err
	}

	ents, err := c.contentRepository.ListClasses(ctx, libraryId, version, req)
	if err != nil {
		return nil, err
	}
	result := view.LibraryClasses{Classes: make([]view.LibraryClass, 0, len(ents))}
	for _, ent := range ents {
		result.Classes = append(result.Classes, entity.MakeLibraryClassView(ent))
	}
	return &result, nil
}

func (c contentServiceImpl) GetClass(ctx context.Context, libraryId, version, classId string) (*view.LibraryClassDetails, error) {
	if err := c.checkVersionExists(ctx, libraryId, version); err != nil {
		return nil, err
	}

	classEnt, err := c.contentRepository.GetClass(ctx, libraryId, version, classId)
	if err != nil {
		return nil, err
	}
	if classEnt == nil {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.LibraryClassNotFound,
			Message: exception.LibraryClassNotFoundMsg,
			Params:  map[string]interface{}{"libraryId": libraryId, "version": version, "classId": classId},
		}
	}

	methodEnts, err := c.contentRepository.ListMethods(ctx, libraryId, version, classId)
	if err != nil {
		return nil, err
	}
	result := view.LibraryClassDetails{
		LibraryClass: entity.MakeLibraryClassView(*classEnt),
		Methods:      make([]view.LibraryMethod, 0, len(methodEnts)),
	}
	for _, methodEnt := range methodEnts {
		result.Methods = append(result.Methods, entity.MakeLibraryMethodView(methodEnt))
	}
	return &result, nil
}

func (c contentServiceImpl) checkVersionExists(ctx context.Context, libraryId, version string) error {
	versionEnt, err := c.libraryVersionRepository.Get(ctx, libraryId, version)
	if err != nil {
		return err
	}
	if versionEnt == nil {
		return libraryVersionNotFound(libraryId, version)
	}
	return nil
}
