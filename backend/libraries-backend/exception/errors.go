package exception

import (
	"fmt"
	"strings"
)

type CustomError struct {
	Status  int                    `json:"status"`
	Code    string                 `json:"code,omitempty"`
	Message string                 `json:"message,omitempty"`
	Params  map[string]interface{} `json:"params,omitempty"`
	Debug   string                 `json:"debug,omitempty"`
}

func (c CustomError) Error() string {
	msg := c.Message
	for k, v := range c.Params {
		msg = strings.ReplaceAll(msg, "$"+k, fmt.Sprintf("%v", v))
	}
	return msg
}

// Codes shared with the other APIHUB services keep the numbers those services use, so a client can treat
// them uniformly.

const IncorrectParamType = "5"
const IncorrectParamTypeMsg = "$param parameter should be $type"

const InvalidURLEscape = "6"
const InvalidURLEscapeMsg = "Failed to unescape parameter $param"

const InvalidParameterValue = "9"
const InvalidParameterValueMsg = "Value '$value' is not allowed for parameter $param"
const InvalidLimitMsg = "Value '$value' is not allowed for parameter limit. Allowed values are in range 1:$maxLimit"

const BadRequestBody = "10"
const BadRequestBodyMsg = "Failed to decode body"

const RequiredParamsMissing = "15"
const RequiredParamsMissingMsg = "Required parameters are missing: $params"

const NoApihubAccess = "200"
const NoApihubAccessMsg = "No access to Apihub with code: $code. Probably incorrect configuration: api key."

const IncorrectMultipartFile = "1000"
const IncorrectMultipartFileMsg = "Unable to read Multipart file"

const InsufficientPrivileges = "1900"
const InsufficientPrivilegesMsg = "You don't have enough privileges to perform this operation"

// Codes of this service.

const LibraryNotFound = "3000"
const LibraryNotFoundMsg = "Library $libraryId is not found"

const LibraryAlreadyExists = "3001"
const LibraryAlreadyExistsMsg = "A library with the same repository and coordinates is already tracked"

const InvalidCoordinates = "3002"
const InvalidCoordinatesMsg = "Coordinates are not valid for language '$language': $details"

const RepositoryNotFound = "3003"
const RepositoryNotFoundMsg = "Repository '$repository' is not configured"

const LibraryVersionNotFound = "3100"
const LibraryVersionNotFoundMsg = "Version $version of library $libraryId is not found"

const LibraryVersionAlreadyExists = "3101"
const LibraryVersionAlreadyExistsMsg = "This version is already imported for the library"

const LanguageNotSupported = "3102"
const LanguageNotSupportedMsg = "Importing a version is not supported for language '$language'; only '$supported' has a build worker"

const LibraryComparisonNotFound = "3200"
const LibraryComparisonNotFoundMsg = "No comparison has been computed yet for this version pair"

const JavaPublishNotFound = "3300"
const JavaPublishNotFoundMsg = "No matching build for libraryId $libraryId and publishId $publishId"

const BuildNotOwned = "3301"
const BuildNotOwnedMsg = "Build $publishId is not assigned to builder $builderId"

const InvalidBuildStatus = "3302"
const InvalidBuildStatusMsg = "Value '$status' is not allowed for parameter status"

const BuildResultMissing = "3303"
const BuildResultMissingMsg = "Part '$part' is required when status is '$status'"

const InvalidBuildResult = "3304"
const InvalidBuildResultMsg = "Failed to read the build result: $details"
