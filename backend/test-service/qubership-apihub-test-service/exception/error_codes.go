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
