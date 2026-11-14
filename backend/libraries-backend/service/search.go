package service

import (
	"context"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

// SearchService searches the content of tracked libraries. It is scoped to this service and does not
// federate with portal-backend's operation search.
type SearchService interface {
	SearchClasses(ctx context.Context, req view.SearchClassesReq) (*view.SearchClassesResult, error)
}

func NewSearchService(contentRepository repository.LibraryContentRepository) SearchService {
	return searchServiceImpl{contentRepository: contentRepository}
}

type searchServiceImpl struct {
	contentRepository repository.LibraryContentRepository
}

func (s searchServiceImpl) SearchClasses(ctx context.Context, req view.SearchClassesReq) (*view.SearchClassesResult, error) {
	for _, kind := range req.Kind {
		if !kind.Valid() {
			return nil, invalidParameter("kind", kind)
		}
	}

	ents, err := s.contentRepository.SearchClasses(ctx, req)
	if err != nil {
		return nil, err
	}
	result := view.SearchClassesResult{Classes: make([]view.SearchResultClass, 0, len(ents))}
	for _, ent := range ents {
		result.Classes = append(result.Classes, entity.MakeClassSearchResultView(ent))
	}
	return &result, nil
}
