package exception

import (
	"fmt"
	"regexp"
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
		pattern := regexp.MustCompile(`\$` + regexp.QuoteMeta(k) + `\b`)
		msg = pattern.ReplaceAllString(msg, fmt.Sprintf("%v", v))
	}
	return msg
}

const IncorrectParamType = "1"
const IncorrectParamTypeMsg = "$param parameter should be $type"

const BadRequestBody = "2"
const BadRequestBodyMsg = "Failed to decode body"

const RequiredParamsMissing = "3"
const RequiredParamsMissingMsg = "Required parameters are missing: $params"

const AgentNotFound = "4"
const AgentNotFoundMsg = "Agent '$agentId' not found"

const InactiveAgent = "5"
const InactiveAgentMsg = "Agent '$agentId' is not active"

const IncompatibleAgentVersion = "6"
const IncompatibleAgentVersionMsg = "Current version $version of Agent not supported by APIHUB. Please, update this instance."

const NoApihubAccess = "7"
const NoApihubAccessMsg = "No access to Apihub with code: $code. Probably incorrect configuration: api key."

const WorkspaceNotFound = "8"
const WorkspaceNotFoundMsg = "Workspace '$workspaceId' not found"

const NamespaceNotFound = "9"
const NamespaceNotFoundMsg = "Namespace '$namespace' not found for agent '$agentId'"

const VersionNameNotAllowed = "10"
const VersionNameNotAllowedMsg = "Version name '$version' contains restricted characters ('$character')"

const InvalidParameter = "11"
const InvalidParameterMsg = "Failed to read parameter $param"
const InvalidLimitMsg = "Value '$value' is not allowed for parameter limit. Allowed values are in range 1:$maxLimit"
const InvalidPageMsg = "Value '$value' is not allowed for parameter page. The value should be an integer"

const InvalidURLEscape = "12"
const InvalidURLEscapeMsg = "Failed to unescape parameter $param"

const ProxyFailed = "13"
const ProxyFailedMsg = "Failed to proxy the request to $url"

const HeadersLimitExceeded = "14"
const HeadersLimitExceededMsg = "HTTP headers limit exceeded. Maximum allowed number of headers is $maxHeaders"

const HeaderValuesLimitExceeded = "15"
const HeaderValuesLimitExceededMsg = "HTTP header values limit exceeded for key '$key'. Maximum allowed number of values is $maxValues"

const SecurityCheckNotFound = "16"
const SecurityCheckNotFoundMsg = "Security check with processId='$processId' not found"

const InsufficientPrivileges = "17"
const InsufficientPrivilegesMsg = "You don't have enough privileges to perform this operation"
