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

package service

import (
	"bufio"
	"bytes"
	goctx "context"
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

func getApihubConfigFileId(projectId string) string {
	return ApiHubBaseConfigPath + projectId + ".json"
}

func getApihubVersionPublishFileId(projectId string) string {
	return ApiHubBaseConfigPath + projectId + "_version_publish.json"
}

func getApihubConfigRaw(configView *view.BranchGitConfigView) ([]byte, error) {
	return json.MarshalIndent(configView, "", " ")
}

func getContentDataFromGit(ctx goctx.Context, client client.GitClient, projectGitId string, ref string, fileId string) (*view.ContentData, error) {
	// TODO: should be context from the request
	goCtx := context.CreateContextWithStacktrace(ctx, fmt.Sprintf("getContentDataFromGit(%s,%s,%s)", projectGitId, ref, fileId))

	data, responseType, blobId, err := client.GetFileContent(goCtx, projectGitId, ref, fileId)
	if err != nil {
		return nil, err
	}

	if data == nil && responseType == "" {
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.FileByRefNotFound,
			Message: exception.FileByRefNotFoundMsg,
			Params: map[string]interface{}{
				"fileId":       fileId,
				"ref":          ref,
				"projectGitId": projectGitId},
		}
	}
	dataType := getMediaType(data)
	return &view.ContentData{FileId: fileId, Data: data, DataType: dataType, BlobId: blobId}, nil
}

func getMediaType(data []byte) string {
	return http.DetectContentType(data)
}

func validateFileInfo(fileId string, filePath string, fileName string) error {
	if strings.Contains(fileId, "//") {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectFilePath,
			Message: exception.IncorrectFilePathMsg,
			Params:  map[string]interface{}{"path": fileId},
		}
	}
	if strings.Contains(fileName, "/") {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectFileName,
			Message: exception.IncorrectFileNameMsg,
			Params:  map[string]interface{}{"name": fileName},
		}
	}
	if strings.Contains(filePath, "//") {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectFilePath,
			Message: exception.IncorrectFilePathMsg,
			Params:  map[string]interface{}{"path": filePath},
		}
	}

	return nil
}

func generateFileId(filePath string, fileName string) string {
	filePath = utils.NormalizeFilePath(filePath)
	fileId := utils.ConcatToFileId(filePath, fileName)

	return fileId
}

func checkAvailability(fileId string, fileIds map[string]bool, folders map[string]bool) error {
	if fileIds[fileId] {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.FileIdIsTaken,
			Message: exception.FileIdIsTakenMsg,
			Params:  map[string]interface{}{"fileId": fileId},
		}
	}

	path, _ := utils.SplitFileId(fileId)
	//check if we have a folder which is a file in fileId
	for folder := range folders {
		if !strings.HasPrefix(folder, "/") {
			folder = folder + "/"
		}
		if strings.HasPrefix(folder, fileId+"/") {
			//directory of a new file for error message
			dir := path
			if dir == "" {
				dir = "Root directory"
			}
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.NameAlreadyTaken,
				Message: exception.NameAlreadyTakenMsg,
				Params:  map[string]interface{}{"name": fileId, "directory": dir},
			}
		}
	}
	//check if we have a file which is a folder in fileId
	for file := range fileIds {
		if strings.HasPrefix(fileId, file+"/") {
			//directory of an existing file for error message
			dir, _ := utils.SplitFileId(file)
			if dir == "" {
				dir = "Root directory"
			}
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.NameAlreadyTaken,
				Message: exception.NameAlreadyTakenMsg,
				Params:  map[string]interface{}{"name": file, "directory": dir},
			}
		}
	}

	return nil
}

func getContentType(filePath string, data *[]byte) view.ShortcutType {
	contentType, _ := GetContentInfo(filePath, data)
	return contentType
}

func GetContentInfo(filePath string, data *[]byte) (view.ShortcutType, string) {
	switch strings.ToUpper(filepath.Ext(filepath.Base(filePath))) {
	case ".JSON":
		return getJsonContentInfo(data)
	case ".YAML", ".YML":
		return getYamlContentType(data)
	case ".MD", ".MARKDOWN":
		return view.MD, ""
	case ".GRAPHQL", ".GQL":
		return view.GraphQLSchema, ""
	default:
		return view.Unknown, ""
	}
}

type jsonMap map[string]interface{}

func (j jsonMap) contains(key string) bool {
	if _, ok := j[key]; ok {
		return true
	}
	return false
}

func (j jsonMap) getString(key string) string {
	if val, ok := j[key]; ok {
		return fmt.Sprint(val)
	}
	return ""
}

func (j jsonMap) getObject(key string) jsonMap {
	if obj, isObj := j[key].(map[string]interface{}); isObj {
		return obj
	}
	return jsonMap{}
}

func (j jsonMap) getValueAsString(key string) string {
	if _, isObj := j[key].(map[string]interface{}); isObj {
		return ""
	}
	if _, isArr := j[key].([]interface{}); isArr {
		return ""
	}
	if val, ok := j[key]; ok {
		return fmt.Sprint(val)
	}

	return ""
}

var openapi20JsonRegexp = regexp.MustCompile(`2.*`)
var openapi30JsonRegexp = regexp.MustCompile(`3.0.*`)
var openapi31JsonRegexp = regexp.MustCompile(`3.1.*`)

func getJsonContentInfo(data *[]byte) (view.ShortcutType, string) {
	var contentJson jsonMap
	json.Unmarshal(*data, &contentJson)

	contentType := view.Unknown
	contentTitle := ""
	if contentJson.contains("graphapi") {
		return view.GraphAPI, ""
	}
	if contentJson.getObject("data").contains("__schema") {
		return view.Introspection, ""
	}
	hasInfo := contentJson.contains("info")
	openapiValue := contentJson.getValueAsString("openapi")
	swaggerValue := contentJson.getValueAsString("swagger")
	if (openapiValue != "" || swaggerValue != "") && hasInfo && contentJson.contains("paths") {
		if openapi30JsonRegexp.MatchString(openapiValue) {
			contentType = view.OpenAPI30
		}
		if contentType == view.Unknown && openapi31JsonRegexp.MatchString(openapiValue) {
			contentType = view.OpenAPI31
		}
		if contentType == view.Unknown && openapi20JsonRegexp.MatchString(swaggerValue) {
			contentType = view.OpenAPI20
		}
	} else if contentJson.contains("asyncapi") && hasInfo {
		contentType = view.AsyncAPI
	} else if schemaType := contentJson.getString("type"); schemaType != "" {
		//goland:noinspection ALL
		correctType, _ := regexp.MatchString("(string|number|object|array|boolean|null){1}", schemaType)
		if correctType {
			contentType = view.JsonSchema
		}
	}

	if contentType != "" && hasInfo {
		infoJson := contentJson.getObject("info")
		contentTitle = infoJson.getValueAsString("title")
	}
	return contentType, contentTitle
}

//goland:noinspection RegExpDuplicateCharacterInClass
var openapi30YamlRegexp = regexp.MustCompile(`^['|"]?openapi['|"]?\s*:\s*['|"]?3.0(.\d)*['|"]?.*`)
var openapi31YamlRegexp = regexp.MustCompile(`^['|"]?openapi['|"]?\s*:\s*['|"]?3.1(.\d)*['|"]?.*`)
var openapi2YamlRegexp = regexp.MustCompile(`^['|"]?swagger['|"]?\s*:\s*['|"]?2(.\d)*['|"]?.*`)
var asyncapi2YamlRegexp = regexp.MustCompile(`^['|"]?asyncapi['|"]?\s*:\s*['|"]?2(.\d)*['|"]?.*`)
var infoYamlRegexp = regexp.MustCompile(`^['|"]?info['|"]?\s*:.*`)
var pathsYamlRegexp = regexp.MustCompile(`^['|"]?paths['|"]?\s*:.*`)
var jsonSchemaYamlRegexp = regexp.MustCompile(`^['|"]?type['|"]?\s*:\s*['|"]?(string|number|object|array|boolean|null){1}['|"]?.*`)
var yamlTitleRegexp = regexp.MustCompile(`^[\s]{1,2}['|"]?title['|"]?\s*:\s*['|"]?(.+?)['|"]?$`)

func getYamlContentType(data *[]byte) (view.ShortcutType, string) {
	var isOpenapi,
		hasOpenapi30Tag,
		hasOpenapi31Tag,
		hasOpenapi2Tag,
		hasAsyncapi2Tag,
		hasInfoTag,
		hasPathsTag,
		isJsonSchema bool
	reader := bytes.NewReader(*data)
	scanner := bufio.NewScanner(reader)
	contentType := view.Unknown
	contentTitle := ""

	for scanner.Scan() {
		text := scanner.Text()
		if text == "" {
			continue
		}
		if !strings.HasPrefix(text, " ") {
			hasInfoTag = hasInfoTag || infoYamlRegexp.MatchString(text)
			hasPathsTag = hasPathsTag || pathsYamlRegexp.MatchString(text)
			isJsonSchema = isJsonSchema || jsonSchemaYamlRegexp.MatchString(text)

			// try to find content Type
			if contentType == view.Unknown {
				if !isOpenapi && !hasAsyncapi2Tag {
					hasOpenapi30Tag = openapi30YamlRegexp.MatchString(text)
					hasOpenapi31Tag = openapi31YamlRegexp.MatchString(text)
					hasOpenapi2Tag = openapi2YamlRegexp.MatchString(text)
					isOpenapi = hasOpenapi30Tag || hasOpenapi31Tag || hasOpenapi2Tag

					hasAsyncapi2Tag = asyncapi2YamlRegexp.MatchString(text)
				}
				if isOpenapi && hasInfoTag && hasPathsTag {
					if hasOpenapi2Tag {
						contentType = view.OpenAPI20
					}
					if hasOpenapi30Tag {
						contentType = view.OpenAPI30
					}
					if hasOpenapi31Tag {
						contentType = view.OpenAPI31
					}
				}
				if hasAsyncapi2Tag && hasInfoTag {
					contentType = view.AsyncAPI
				}
			}
		}
		//try to find content Title
		if hasInfoTag && contentTitle == "" {
			parts := yamlTitleRegexp.FindStringSubmatch(text)
			for _, title := range parts {
				contentTitle = title
			}
		}
	}
	if isJsonSchema {
		contentType = view.JsonSchema
	}

	return contentType, contentTitle
}

func equalStringSets(first []string, second []string) bool {
	if len(first) != len(second) {
		return false
	}
	exists := make(map[string]bool)
	for _, value := range first {
		exists[value] = true
	}
	for _, value := range second {
		if !exists[value] {
			return false
		}
	}
	return true
}

func convertEol(data []byte) []byte {
	convertedData := string(data)
	convertedData = strings.Replace(convertedData, "\r\n", "\n", -1)
	return []byte(convertedData)
}

// replaces any {variable} with {*}
func normalizeEndpointPath(path string) string {
	if strings.IndexByte(path, '{') < 0 {
		return path
	}
	var result strings.Builder
	var isVariable bool

	result.Grow(len(path))

	for _, char := range path {
		if isVariable {
			if char == '}' {
				//variable end
				isVariable = false

				result.WriteRune('*')
				result.WriteRune('}')
			}
			continue
		}
		if char == '{' {
			//variable start
			isVariable = true
		}
		result.WriteRune(char)
	}
	return result.String()
}
