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

package client

import (
	"encoding/base64"
	"path"
	"strings"
)

const ActionTypeCreate = "create"
const ActionTypeDelete = "delete"
const ActionTypeMove = "move"
const ActionTypeUpdate = "update"

type Action struct {
	Type            string
	FilePath        string
	PreviousPath    string
	Content         string
	isBase64Encoded bool
}

func NewActionBuilder() *ActionBuilder {
	return &ActionBuilder{actions: []Action{}}
}

type ActionBuilder struct {
	actions []Action
}

func (b *ActionBuilder) Create(path string, content []byte) *ActionBuilder {
	if isKnownTextFormatExtension(path) {
		b.actions = append(b.actions, Action{
			Type:     ActionTypeCreate,
			FilePath: path,
			Content:  string(content),
		})
	} else {
		base64Res := make([]byte, base64.StdEncoding.EncodedLen(len(content)))
		base64.StdEncoding.Encode(base64Res, content)
		b.actions = append(b.actions, Action{
			Type:            ActionTypeCreate,
			FilePath:        path,
			Content:         string(base64Res),
			isBase64Encoded: true,
		})
	}

	return b
}

func (b *ActionBuilder) Update(path string, content []byte) *ActionBuilder {
	if isKnownTextFormatExtension(path) {
		b.actions = append(b.actions, Action{
			Type:     ActionTypeUpdate,
			FilePath: path,
			Content:  string(content),
		})
	} else {

		base64Res := make([]byte, base64.StdEncoding.EncodedLen(len(content)))
		base64.StdEncoding.Encode(base64Res, content)
		b.actions = append(b.actions, Action{
			Type:            ActionTypeUpdate,
			FilePath:        path,
			Content:         string(base64Res),
			isBase64Encoded: true,
		})
	}
	return b
}

// todo content field is required for this operation?
func (b *ActionBuilder) Delete(path string, content []byte) *ActionBuilder {
	if isKnownTextFormatExtension(path) {
		b.actions = append(b.actions, Action{
			Type:     ActionTypeDelete,
			FilePath: path,
			Content:  string(content),
		})
	} else {
		base64Res := make([]byte, base64.StdEncoding.EncodedLen(len(content)))
		base64.StdEncoding.Encode(base64Res, content)
		b.actions = append(b.actions, Action{
			Type:            ActionTypeDelete,
			FilePath:        path,
			Content:         string(base64Res),
			isBase64Encoded: true,
		})
	}
	return b
}

func (b *ActionBuilder) Move(oldPath string, newPath string, content []byte) *ActionBuilder {
	if isKnownTextFormatExtension(newPath) {
		b.actions = append(b.actions, Action{
			Type:         ActionTypeMove,
			FilePath:     newPath,
			PreviousPath: oldPath,
			Content:      string(content),
		})
	} else {
		base64Res := make([]byte, base64.StdEncoding.EncodedLen(len(content)))
		base64.StdEncoding.Encode(base64Res, content)
		b.actions = append(b.actions, Action{
			Type:            ActionTypeMove,
			FilePath:        newPath,
			PreviousPath:    oldPath,
			Content:         string(base64Res),
			isBase64Encoded: true,
		})
	}
	return b
}

func (b *ActionBuilder) MoveAndUpdate(oldPath string, newPath string, content []byte) *ActionBuilder {
	if isKnownTextFormatExtension(newPath) {
		b.actions = append(b.actions, Action{
			Type:         ActionTypeUpdate,
			FilePath:     newPath,
			PreviousPath: oldPath,
			Content:      string(content),
		})
	} else {
		base64Res := make([]byte, base64.StdEncoding.EncodedLen(len(content)))
		base64.StdEncoding.Encode(base64Res, content)
		b.actions = append(b.actions, Action{
			Type:            ActionTypeUpdate,
			FilePath:        newPath,
			PreviousPath:    oldPath,
			Content:         string(base64Res),
			isBase64Encoded: true,
		})
	}
	return b
}

func (b ActionBuilder) Build() []Action {
	return b.actions
}

func isKnownTextFormatExtension(filePath string) bool {
	ext := strings.ToLower(strings.TrimPrefix(path.Ext(filePath), "."))
	switch ext {
	case "json", "yaml", "yml", "md", "txt":
		return true
	}
	return false
}
