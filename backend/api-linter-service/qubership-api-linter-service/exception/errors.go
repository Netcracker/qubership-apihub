// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
		//todo make smart replace (e.g. now it replaces $projectId if we have $project in params)
		msg = strings.ReplaceAll(msg, "$"+k, fmt.Sprintf("%v", v))
	}
	return msg
}

const NoApihubAccess = "200"
const NoApihubAccessMsg = "No access to Apihub with code: $code. Probably incorrect configuration: api key."

const DuplicateEvent = "10000"
const DuplicateEventMsg = "Unable to create version lint task: event id $event_id already exists"

const InvalidRevisionFormat = "2500"
const InvalidRevisionFormatMsg = "Version '$version' has invalid revision format"

const InvalidURLEscape = "6"
const InvalidURLEscapeMsg = "Failed to unescape parameter $param"

const InvalidParameterValue = "9"
const InvalidParameterValueMsg = "Value '$value' is not allowed for parameter $param"

const BadRequestBody = "10"
const BadRequestBodyMsg = "Failed to decode body"

const RequiredParamsMissing = "15"
const RequiredParamsMissingMsg = "Required parameters are missing: $params"

const IncorrectMultipartFile = "1000"
const IncorrectMultipartFileMsg = "Unable to read Multipart file"

const InsufficientPrivileges = "1900"
const InsufficientPrivilegesMsg = "You don't have enough privileges to perform this operation"

const EntityNotFound = "100"
const EntityNotFoundMsg = "$entity with id $id is not found"

const RulesetCanNotBeDeleted = "2000"
const RulesetCanNotBeDeletedMsg = "Ruleset with $id can not be deleted because it's active or has been activated"

const LintResultNotFound = "2100"
const LintResultNotFoundMsg = "Validation result not found for packageId $packageId and version $version"
