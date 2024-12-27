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

package websocket

type BranchEvent struct {
	ProjectId  string      `json:"projectId" msgpack:"projectId"`
	BranchName string      `json:"branchName" msgpack:"branchName"`
	WsId       string      `json:"wsId" msgpack:"wsId"`
	Action     interface{} `json:"action" msgpack:"action"`
}

func BranchEventFromMap(m map[string]interface{}) BranchEvent {
	return BranchEvent{
		ProjectId:  m["projectId"].(string),
		BranchName: m["branchName"].(string),
		WsId:       m["wsId"].(string),
		Action:     m["action"],
	}
}

func BranchEventToMap(e BranchEvent) map[string]interface{} {
	result := map[string]interface{}{}
	result["projectId"] = e.ProjectId
	result["branchName"] = e.BranchName
	result["wsId"] = e.WsId
	result["action"] = e.Action
	return result
}

type FileEvent struct {
	ProjectId  string `json:"projectId" msgpack:"projectId"`
	BranchName string `json:"branchName" msgpack:"branchName"`
	FileId     string `json:"fileId" msgpack:"fileId"`
	Action     string `json:"action" msgpack:"action"`
	Content    string `json:"content" msgpack:"content"`
}

func FileEventFromMap(m map[string]interface{}) FileEvent {
	return FileEvent{
		ProjectId:  m["projectId"].(string),
		BranchName: m["branchName"].(string),
		FileId:     m["fileId"].(string),
		Action:     m["action"].(string),
		Content:    m["content"].(string),
	}
}

func FileEventToMap(e FileEvent) map[string]interface{} {
	result := map[string]interface{}{}
	result["projectId"] = e.ProjectId
	result["branchName"] = e.BranchName
	result["fileId"] = e.FileId
	result["action"] = e.Action
	result["content"] = e.Content
	return result
}
