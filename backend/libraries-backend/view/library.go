package view

import (
	"fmt"
	"regexp"
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
		if err := c.validateMaven(); err != nil {
			return "", err
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

// mavenPartPattern is the character set Maven allows in a groupId, artifactId, or classifier. It also
// rules out ':' and '/', which would corrupt the coordinates key and the metadata URL.
var mavenPartPattern = regexp.MustCompile(`^[A-Za-z0-9_\-.]+$`)

func (c LibraryCoordinates) validateMaven() error {
	parts := []struct{ name, value string }{
		{"groupId", c.GroupId},
		{"artifactId", c.ArtifactId},
	}
	if c.Classifier != "" {
		parts = append(parts, struct{ name, value string }{"classifier", c.Classifier})
	}
	for _, part := range parts {
		if !mavenPartPattern.MatchString(part.value) {
			return fmt.Errorf("%s '%s' may contain only letters, digits, '_', '-' and '.'", part.name, part.value)
		}
	}
	for _, segment := range strings.Split(c.GroupId, ".") {
		if segment == "" {
			return fmt.Errorf("groupId '%s' must not contain empty segments", c.GroupId)
		}
	}
	return nil
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
	ParentPackageId string             `json:"parentPackageId"`
	Coordinates     LibraryCoordinates `json:"coordinates"`
	DefaultRole     string             `json:"defaultRole,omitempty"`
}

// LibraryUpdateReq is a PATCH body: a nil field is left untouched. Alias, parent package, repository,
// language, and coordinates are immutable after creation and therefore absent here.
type LibraryUpdateReq struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	DefaultRole *string `json:"defaultRole,omitempty"`
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
