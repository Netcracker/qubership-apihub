package view

import (
	"fmt"
	"strings"
	"time"
)

type Language string

const (
	LanguageJava Language = "java"
	LanguageGo   Language = "go"
	LanguageJs   Language = "js"
)

func (l Language) Valid() bool {
	switch l {
	case LanguageJava, LanguageGo, LanguageJs:
		return true
	}
	return false
}

// DefaultLibraryRole is the role a caller gets on a library that does not name one, mirroring
// portal-backend's default package role.
const DefaultLibraryRole = "Viewer"

// LibraryCoordinates addresses a library inside its repository. Which fields carry meaning depends on
// the library's Language: Maven group/artifact for java, a module path for go, a package name and
// optional scope for js. CoordinatesKey derives the normalised lookup string from them.
type LibraryCoordinates struct {
	GroupId     string `json:"groupId,omitempty"`
	ArtifactId  string `json:"artifactId,omitempty"`
	Classifier  string `json:"classifier,omitempty"`
	ModulePath  string `json:"modulePath,omitempty"`
	PackageName string `json:"packageName,omitempty"`
	Scope       string `json:"scope,omitempty"`
}

// CoordinatesKey normalises the coordinates of one language into the string the database indexes and
// uniqueness checks use. It fails when the fields the language requires are missing.
func (c LibraryCoordinates) CoordinatesKey(language Language) (string, error) {
	switch language {
	case LanguageJava:
		if c.GroupId == "" || c.ArtifactId == "" {
			return "", fmt.Errorf("java coordinates require groupId and artifactId")
		}
		key := c.GroupId + ":" + c.ArtifactId
		if c.Classifier != "" {
			key += ":" + c.Classifier
		}
		return key, nil
	case LanguageGo:
		if c.ModulePath == "" {
			return "", fmt.Errorf("go coordinates require modulePath")
		}
		return c.ModulePath, nil
	case LanguageJs:
		if c.PackageName == "" {
			return "", fmt.Errorf("js coordinates require packageName")
		}
		if c.Scope != "" {
			return strings.TrimSuffix(c.Scope, "/") + "/" + c.PackageName, nil
		}
		return c.PackageName, nil
	}
	return "", fmt.Errorf("unknown language '%s'", language)
}

// Gav renders the Maven coordinates of a version as the `groupId:artifactId:version` string the Java
// worker expects in a build task's metadata.
func (c LibraryCoordinates) Gav(version string) string {
	gav := c.GroupId + ":" + c.ArtifactId + ":" + version
	if c.Classifier != "" {
		gav += ":" + c.Classifier
	}
	return gav
}

type LibraryCreateReq struct {
	Alias           string             `json:"alias"`
	Name            string             `json:"name"`
	Description     string             `json:"description,omitempty"`
	Language        Language           `json:"language"`
	Repository      string             `json:"repository"`
	ParentPackageId string             `json:"parentPackageId,omitempty"`
	Coordinates     LibraryCoordinates `json:"coordinates"`
	DefaultRole     string             `json:"defaultRole,omitempty"`
}

// LibraryUpdateReq is a PATCH body: a nil field is left untouched. Repository, language, and coordinates
// are immutable after creation and therefore absent here.
type LibraryUpdateReq struct {
	Alias           *string `json:"alias,omitempty"`
	Name            *string `json:"name,omitempty"`
	Description     *string `json:"description,omitempty"`
	ParentPackageId *string `json:"parentPackageId,omitempty"`
	DefaultRole     *string `json:"defaultRole,omitempty"`
}

type Library struct {
	LibraryId       string             `json:"libraryId"`
	Alias           string             `json:"alias"`
	Name            string             `json:"name"`
	Description     string             `json:"description,omitempty"`
	Language        Language           `json:"language"`
	Repository      string             `json:"repository"`
	ParentPackageId string             `json:"parentPackageId,omitempty"`
	Coordinates     LibraryCoordinates `json:"coordinates"`
	CoordinatesKey  string             `json:"coordinatesKey"`
	DefaultRole     string             `json:"defaultRole,omitempty"`
	IsFavorite      bool               `json:"isFavorite"`
	CreatedAt       time.Time          `json:"createdAt"`
	CreatedBy       string             `json:"createdBy"`
}

type Libraries struct {
	Libraries []Library `json:"libraries"`
}

type LibraryListReq struct {
	Repository      string
	Language        Language
	ParentPackageId string
	TextFilter      string
	OnlyFavorite    bool
	Limit           int
	Page            int
}
