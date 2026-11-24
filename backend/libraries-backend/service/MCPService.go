package service

import (
	"context"
	"encoding/json"

	"github.com/mark3labs/mcp-go/mcp"
	mcpserver "github.com/mark3labs/mcp-go/server"
)

type MCPService interface {
	MakeMCPServer() *mcpserver.MCPServer
}

func NewMCPService(
	libraryService LibraryService,
	libraryVersionService LibraryVersionService,
	contentService ContentService,
	searchService SearchService,
	changesService ChangesService,
	authorizationService AuthorizationService,
) MCPService {
	return &mcpService{
		libraryService:        libraryService,
		libraryVersionService: libraryVersionService,
		contentService:        contentService,
		searchService:         searchService,
		changesService:        changesService,
		authorizationService:  authorizationService,
	}
}

type mcpService struct {
	libraryService        LibraryService
	libraryVersionService LibraryVersionService
	contentService        ContentService
	searchService         SearchService
	changesService        ChangesService
	authorizationService  AuthorizationService
}

const (
	mcpServerName    = "apihub-libraries-mcp"
	mcpServerVersion = "0.0.1"
)

const (
	ToolNameListLibraries         = "list_libraries"
	ToolNameGetLibrary            = "get_library"
	ToolNameCreateLibrary         = "create_library"
	ToolNameListLibraryVersions   = "list_library_versions"
	ToolNameGetLibraryVersion     = "get_library_version"
	ToolNameListAvailableVersions = "list_available_versions"
	ToolNameImportLibraryVersion  = "import_library_version"
	ToolNameListLibraryClasses    = "list_library_classes"
	ToolNameGetLibraryClass       = "get_library_class"
	ToolNameSearchClasses         = "search_classes"
	ToolNameListChanges           = "list_changes"
)

type mcpToolHandler func(m *mcpService, ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error)

type mcpToolDefinition struct {
	Name        string
	Description string
	Schema      json.RawMessage
	ReadOnly    bool
	Handler     mcpToolHandler
}

func (m *mcpService) MakeMCPServer() *mcpserver.MCPServer {
	s := mcpserver.NewMCPServer(
		mcpServerName,
		mcpServerVersion,
		mcpserver.WithToolCapabilities(false),
		mcpserver.WithInstructions(mcpInstructionsLibraries),
	)

	for _, def := range mcpToolDefinitions() {
		handler := def.Handler
		s.AddTool(mcp.Tool{
			Name:           def.Name,
			Description:    def.Description,
			RawInputSchema: def.Schema,
			Annotations: mcp.ToolAnnotation{
				ReadOnlyHint:    mcp.ToBoolPtr(def.ReadOnly),
				DestructiveHint: mcp.ToBoolPtr(false),
			},
		}, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			return handler(m, ctx, req)
		})
	}
	return s
}

func mcpToolDefinitions() []mcpToolDefinition {
	return []mcpToolDefinition{
		{
			Name:        ToolNameListLibraries,
			Description: toolDescriptionListLibraries,
			Schema:      listLibrariesSchema,
			ReadOnly:    true,
			Handler:     (*mcpService).executeListLibraries,
		},
		{
			Name:        ToolNameGetLibrary,
			Description: toolDescriptionGetLibrary,
			Schema:      libraryIdSchema,
			ReadOnly:    true,
			Handler:     (*mcpService).executeGetLibrary,
		},
		{
			Name:        ToolNameCreateLibrary,
			Description: toolDescriptionCreateLibrary,
			Schema:      createLibrarySchema,
			Handler:     (*mcpService).executeCreateLibrary,
		},
		{
			Name:        ToolNameListLibraryVersions,
			Description: toolDescriptionListLibraryVersions,
			Schema:      listLibraryVersionsSchema,
			ReadOnly:    true,
			Handler:     (*mcpService).executeListLibraryVersions,
		},
		{
			Name:        ToolNameGetLibraryVersion,
			Description: toolDescriptionGetLibraryVersion,
			Schema:      libraryVersionSchema,
			ReadOnly:    true,
			Handler:     (*mcpService).executeGetLibraryVersion,
		},
		{
			Name:        ToolNameListAvailableVersions,
			Description: toolDescriptionListAvailableVersions,
			Schema:      listAvailableVersionsSchema,
			ReadOnly:    true,
			Handler:     (*mcpService).executeListAvailableVersions,
		},
		{
			Name:        ToolNameImportLibraryVersion,
			Description: toolDescriptionImportLibraryVersion,
			Schema:      importLibraryVersionSchema,
			Handler:     (*mcpService).executeImportLibraryVersion,
		},
		{
			Name:        ToolNameListLibraryClasses,
			Description: toolDescriptionListLibraryClasses,
			Schema:      listLibraryClassesSchema,
			ReadOnly:    true,
			Handler:     (*mcpService).executeListLibraryClasses,
		},
		{
			Name:        ToolNameGetLibraryClass,
			Description: toolDescriptionGetLibraryClass,
			Schema:      getLibraryClassSchema,
			ReadOnly:    true,
			Handler:     (*mcpService).executeGetLibraryClass,
		},
		{
			Name:        ToolNameSearchClasses,
			Description: toolDescriptionSearchClasses,
			Schema:      searchClassesSchema,
			ReadOnly:    true,
			Handler:     (*mcpService).executeSearchClasses,
		},
		{
			Name:        ToolNameListChanges,
			Description: toolDescriptionListChanges,
			Schema:      listChangesSchema,
			ReadOnly:    true,
			Handler:     (*mcpService).executeListChanges,
		},
	}
}

const mcpInstructionsLibraries = `The apihub-libraries-mcp server exposes the Java libraries tracked by the APIHUB Libraries service: libraries, their imported versions, the classes and methods of each version, and the API changes between versions.

DATA:
- A library is one Maven artifact (groupId:artifactId) in a configured repository. libraryId identifies it in every other tool.
- A version is imported from the repository and built asynchronously. Its content (classes and methods) and its comparison with the previous version appear only after the build finishes.

TYPICAL FLOWS:
1. Find a library: list_libraries with textFilter, then get_library.
2. Import a new version: list_available_versions, then import_library_version, then poll get_library_version until metadata.buildStatus is complete or failed.
3. Read the API: list_library_classes and get_library_class for one version, or search_classes across libraries.
4. Review changes: list_changes for a version against its previous version (or an explicit previousVersion).
5. Track a library that is not in APIHUB yet: create_library, then flow 2.

RESPONSES:
- All list tools are paged with limit (1-100, default 100) and page (0-based).
- If a version has no classes or no comparison yet, its build is probably still running; check get_library_version.`

const limitPageProperties = `
		"limit": {
			"type": "integer",
			"minimum": 1,
			"maximum": 100,
			"description": "Page size, 1-100. Default 100."
		},
		"page": {
			"type": "integer",
			"minimum": 0,
			"description": "0-based page number. Default 0."
		}`

const libraryIdProperty = `
		"libraryId": {
			"type": "string",
			"description": "Library ID, as returned by list_libraries"
		}`

const versionProperty = `
		"version": {
			"type": "string",
			"description": "Imported library version, for example 3.14.0"
		}`

var libraryIdSchema = json.RawMessage(`{
	"type": "object",
	"properties": {` + libraryIdProperty + `
	},
	"required": ["libraryId"]
}`)

var libraryVersionSchema = json.RawMessage(`{
	"type": "object",
	"properties": {` + libraryIdProperty + `,` + versionProperty + `
	},
	"required": ["libraryId", "version"]
}`)

const toolDescriptionListLibraries = `Lists the libraries tracked in APIHUB, ordered by name.

Use it to find the libraryId of a library by name, alias, or Maven coordinates (textFilter), or to browse the libraries of a repository or a parent package.`

var listLibrariesSchema = json.RawMessage(`{
	"type": "object",
	"properties": {
		"textFilter": {
			"type": "string",
			"description": "Substring of the library name, alias, or coordinates (for example commons-lang3)"
		},
		"repository": {
			"type": "string",
			"description": "Only the libraries of this repository"
		},
		"language": {
			"type": "string",
			"enum": ["java", "go", "js"],
			"description": "Only the libraries of this language"
		},
		"parentPackageId": {
			"type": "string",
			"description": "Only the libraries attached to this APIHUB package"
		},
		"onlyFavorite": {
			"type": "boolean",
			"description": "Only the libraries the caller marked as favorite"
		},` + limitPageProperties + `
	}
}`)

const toolDescriptionGetLibrary = `Returns one library: name, alias, language, repository, Maven coordinates, parent package, and default role.`

const toolDescriptionCreateLibrary = `Starts tracking a library from a configured repository. Requires the right to create packages in parentPackageId (or the system administrator role when parentPackageId is omitted).

The library has no versions after creation; use list_available_versions and import_library_version next. Only java libraries can import versions.`

var createLibrarySchema = json.RawMessage(`{
	"type": "object",
	"properties": {
		"alias": {
			"type": "string",
			"description": "Short unique alias of the library"
		},
		"name": {
			"type": "string",
			"description": "Display name"
		},
		"description": {
			"type": "string"
		},
		"language": {
			"type": "string",
			"enum": ["java", "go", "js"]
		},
		"repository": {
			"type": "string",
			"description": "Configured repository the library is read from"
		},
		"parentPackageId": {
			"type": "string",
			"description": "APIHUB package the library belongs to; its roles apply to the library"
		},
		"coordinates": {
			"type": "object",
			"description": "For java: groupId and artifactId (classifier is optional)",
			"properties": {
				"groupId": {"type": "string"},
				"artifactId": {"type": "string"},
				"classifier": {"type": "string"},
				"modulePath": {"type": "string"},
				"packageName": {"type": "string"},
				"scope": {"type": "string"}
			}
		},
		"defaultRole": {
			"type": "string",
			"description": "Role every authenticated user has on the library. Default Viewer."
		}
	},
	"required": ["alias", "name", "language", "repository", "coordinates"]
}`)

const toolDescriptionListLibraryVersions = `Lists the imported versions of a library, newest first, with their status, labels, previous version, and build metadata.`

var listLibraryVersionsSchema = json.RawMessage(`{
	"type": "object",
	"properties": {` + libraryIdProperty + `,
		"status": {
			"type": "array",
			"items": {"type": "string", "enum": ["draft", "release"]},
			"description": "Only the versions with these statuses"
		},
		"textFilter": {
			"type": "string",
			"description": "Substring of the version name or a label"
		},` + limitPageProperties + `
	},
	"required": ["libraryId"]
}`)

const toolDescriptionGetLibraryVersion = `Returns one imported version of a library. metadata.buildStatus and metadata.buildError tell whether the import build is still running, finished, or failed; poll this tool after import_library_version.`

const toolDescriptionListAvailableVersions = `Lists the versions that the library's Maven repository has (maven-metadata.xml) and that are not imported yet, newest first. These are the values import_library_version accepts. Requires the right to import versions of the library.`

var listAvailableVersionsSchema = json.RawMessage(`{
	"type": "object",
	"properties": {` + libraryIdProperty + `,
		"textFilter": {
			"type": "string",
			"description": "Substring of the version, for example 3.1"
		},` + limitPageProperties + `
	},
	"required": ["libraryId"]
}`)

const toolDescriptionImportLibraryVersion = `Imports a version of a java library from its repository. The version is created at once with no content, and a build runs asynchronously: it extracts the classes and methods and, when the version has a previous version, compares the two.

Poll get_library_version to follow the build. Requires the right to manage draft versions of the library.`

var importLibraryVersionSchema = json.RawMessage(`{
	"type": "object",
	"properties": {` + libraryIdProperty + `,
		"version": {
			"type": "string",
			"description": "Version to import, as returned by list_available_versions"
		},
		"labels": {
			"type": "array",
			"items": {"type": "string"}
		},
		"previousVersion": {
			"type": "string",
			"description": "Imported version to compare with. When omitted, the latest imported release version is used."
		}
	},
	"required": ["libraryId", "version"]
}`)

const toolDescriptionListLibraryClasses = `Lists the classes (and interfaces, enums, annotations, records) of one imported library version, ordered by qualified name. The list is empty while the version's build is running.`

var listLibraryClassesSchema = json.RawMessage(`{
	"type": "object",
	"properties": {` + libraryIdProperty + `,` + versionProperty + `,
		"textFilter": {
			"type": "string",
			"description": "Case-insensitive substring of the qualified class name"
		},
		"kind": {
			"type": "array",
			"items": {"type": "string", "enum": ["class", "interface", "enum", "annotation", "record"]}
		},` + limitPageProperties + `
	},
	"required": ["libraryId", "version"]
}`)

const toolDescriptionGetLibraryClass = `Returns one class of an imported library version with all its methods and constructors (signatures, modifiers, deprecation).`

var getLibraryClassSchema = json.RawMessage(`{
	"type": "object",
	"properties": {` + libraryIdProperty + `,` + versionProperty + `,
		"classId": {
			"type": "string",
			"description": "Class ID, as returned by list_library_classes or search_classes"
		}
	},
	"required": ["libraryId", "version", "classId"]
}`)

const toolDescriptionSearchClasses = `Full-text search over the classes and methods of all tracked libraries, or of one library or version. A result is either a class or a method of a class (methodId and signature are set).`

var searchClassesSchema = json.RawMessage(`{
	"type": "object",
	"properties": {
		"textFilter": {
			"type": "string",
			"description": "Words to search for, for example ObjectMapper readValue"
		},
		"libraryId": {
			"type": "string",
			"description": "Only this library"
		},
		"version": {
			"type": "string",
			"description": "Only this version; requires libraryId"
		},
		"kind": {
			"type": "array",
			"items": {"type": "string", "enum": ["class", "interface", "enum", "annotation", "record"]}
		},` + limitPageProperties + `
	},
	"required": ["textFilter"]
}`)

const toolDescriptionListChanges = `Lists the class- and method-level API changes of a library version against a previous version, with a summary of counts by severity (breaking, non-breaking, annotation).

By default the version is compared with its own previous version. A comparison exists only after the import build has finished; until then the tool reports that no comparison is computed yet.`

var listChangesSchema = json.RawMessage(`{
	"type": "object",
	"properties": {` + libraryIdProperty + `,` + versionProperty + `,
		"previousLibraryId": {
			"type": "string",
			"description": "Library of the version to compare with. Default: libraryId."
		},
		"previousVersion": {
			"type": "string",
			"description": "Version to compare with. Default: the version's previous version."
		},
		"severity": {
			"type": "array",
			"items": {"type": "string", "enum": ["breaking", "non-breaking", "annotation"]}
		},
		"changeType": {
			"type": "array",
			"items": {"type": "string", "enum": ["added", "removed", "changed", "deprecated"]}
		},
		"classId": {
			"type": "string",
			"description": "Only the changes of this class and its methods"
		},` + limitPageProperties + `
	},
	"required": ["libraryId", "version"]
}`)
