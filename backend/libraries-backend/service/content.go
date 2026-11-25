package service

import (
	"context"
	"encoding/json"
	"fmt"
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
	hashes := make([]string, 0, len(methodEnts))
	for _, methodEnt := range methodEnts {
		hashes = append(hashes, methodEnt.DataHash)
	}
	methodData, err := c.contentRepository.ListMethodData(ctx, hashes)
	if err != nil {
		return nil, err
	}

	result := view.LibraryClassDetails{
		LibraryClass: entity.MakeLibraryClassView(*classEnt),
		Methods:      make([]view.LibraryMethod, 0, len(methodEnts)),
		Constructors: make([]view.LibraryMethod, 0),
		Fields:       make([]view.LibraryField, 0, classEnt.FieldCount),
	}
	for _, methodEnt := range methodEnts {
		var body struct {
			ElementType string `json:"elementType"`
		}
		if err := json.Unmarshal(methodData[methodEnt.DataHash], &body); err != nil {
			return nil, fmt.Errorf("failed to decode the body of %s#%s: %w", classId, methodEnt.MethodId, err)
		}
		methodView := entity.MakeLibraryMethodView(methodEnt)
		if body.ElementType == view.ElementTypeConstructor {
			result.Constructors = append(result.Constructors, methodView)
		} else {
			result.Methods = append(result.Methods, methodView)
		}
	}

	classData, err := c.contentRepository.GetClassData(ctx, classEnt.DataHash)
	if err != nil {
		return nil, err
	}
	var classBody struct {
		Fields []view.ApiChange `json:"fields"`
	}
	if err := json.Unmarshal(classData, &classBody); err != nil {
		return nil, fmt.Errorf("failed to decode the body of class %s: %w", classId, err)
	}
	for _, field := range classBody.Fields {
		result.Fields = append(result.Fields, view.LibraryField{ClassId: classId, Signature: field.Member})
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
