package entity

import (
	"encoding/json"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type LibraryEntity struct {
	tableName struct{} `pg:"library,alias:library"`

	Id              string                 `pg:"id,pk,type:varchar"`
	Alias           string                 `pg:"alias,type:varchar"`
	Name            string                 `pg:"name,type:varchar"`
	Description     string                 `pg:"description,type:text"`
	Language        string                 `pg:"language,type:varchar,notnull"`
	Repository      string                 `pg:"repository,type:varchar,notnull"`
	ParentPackageId string                 `pg:"parent_package_id,type:varchar"`
	Coordinates     map[string]interface{} `pg:"coordinates,type:jsonb,notnull"`
	CoordinatesKey  string                 `pg:"coordinates_key,type:varchar,notnull"`
	DefaultRole     string                 `pg:"default_role,type:varchar,notnull"`
	CreatedAt       time.Time              `pg:"created_at,type:timestamp without time zone,notnull"`
	CreatedBy       string                 `pg:"created_by,type:varchar,notnull"`
	DeletedAt       *time.Time             `pg:"deleted_at,type:timestamp without time zone"`
	DeletedBy       string                 `pg:"deleted_by,type:varchar"`
}

// LibraryWithFavoriteEntity carries the per-caller favorite flag that the library list query joins in.
type LibraryWithFavoriteEntity struct {
	tableName struct{} `pg:"library,alias:library"`

	LibraryEntity
	IsFavorite bool `pg:"is_favorite,type:boolean"`
}

// CoordinatesMap renders typed coordinates as the jsonb document stored on the row. Only the fields the
// language uses are written, so a Maven library does not carry empty npm keys.
func CoordinatesMap(coordinates view.LibraryCoordinates) (map[string]interface{}, error) {
	raw, err := json.Marshal(coordinates)
	if err != nil {
		return nil, err
	}
	var asMap map[string]interface{}
	if err := json.Unmarshal(raw, &asMap); err != nil {
		return nil, err
	}
	return asMap, nil
}

func coordinatesView(stored map[string]interface{}) view.LibraryCoordinates {
	var coordinates view.LibraryCoordinates
	raw, err := json.Marshal(stored)
	if err != nil {
		return coordinates
	}
	// A document that does not parse into the typed shape leaves the zero value; CoordinatesKey on the row
	// stays authoritative for lookup either way.
	_ = json.Unmarshal(raw, &coordinates)
	return coordinates
}

func MakeLibraryView(ent LibraryEntity, isFavorite bool) view.Library {
	return view.Library{
		LibraryId:       ent.Id,
		Alias:           ent.Alias,
		Name:            ent.Name,
		Description:     ent.Description,
		Language:        view.Language(ent.Language),
		Repository:      ent.Repository,
		ParentPackageId: ent.ParentPackageId,
		Coordinates:     coordinatesView(ent.Coordinates),
		CoordinatesKey:  ent.CoordinatesKey,
		DefaultRole:     ent.DefaultRole,
		IsFavorite:      isFavorite,
		CreatedAt:       ent.CreatedAt,
		CreatedBy:       ent.CreatedBy,
	}
}

func MakeLibrarySearchResultView(ent LibraryEntity) view.SearchResultLibrary {
	return view.SearchResultLibrary{
		LibraryId:      ent.Id,
		Name:           ent.Name,
		Alias:          ent.Alias,
		Language:       view.Language(ent.Language),
		Repository:     ent.Repository,
		CoordinatesKey: ent.CoordinatesKey,
	}
}
