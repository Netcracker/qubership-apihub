package exception

// General

const FailedToReadSpecFile = "10001"
const FailedToReadSpecFileMsg = "Failed to read specification file"

const InvalidPathURLEscape = "20000"
const InvalidPathURLEscapeMsg = "Failed to unescape path parameter $param"

const InvalidQueryURLEscape = "20001"
const InvalidQueryURLEscapeMsg = "Failed to unescape query parameter $param"

const PathParameterWithoutEscapedCharacters = "20002"
const PathParameterWithoutEscapedCharactersMsg = "Path parameter '$param' must contain escaped characters"

const QueryParameterWithoutEscapedCharacters = "20003"
const QueryParameterWithoutEscapedCharactersMsg = "Query parameter '$param' must contain escaped characters"

const BadRequestBody = "20004"
const BadRequestBodyMsg = "Failed to decode body"

const EmptyBodyParam = "20005"
const EmptyBodyParamMsg = "Body parameter $param is empty"
