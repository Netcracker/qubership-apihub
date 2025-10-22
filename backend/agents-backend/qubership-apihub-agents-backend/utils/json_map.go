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

package utils

import "fmt"

type JsonMap map[string]interface{}

func (j JsonMap) GetValueAsString(key string) string {
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

func (j JsonMap) GetObject(key string) JsonMap {
	if obj, isObj := j[key].(map[string]interface{}); isObj {
		return obj
	}
	return JsonMap{}
}

func (j JsonMap) GetObjectsArray(key string) []JsonMap {
	if array, ok := j[key].([]interface{}); ok {
		objectsArray := make([]JsonMap, 0)
		for _, el := range array {
			if obj, ok := el.(map[string]interface{}); ok {
				objectsArray = append(objectsArray, obj)
			}
		}
		return objectsArray
	}
	return []JsonMap{}
}

func (j JsonMap) GetKeys() []string {
	keys := make([]string, 0)
	for key := range j {
		keys = append(keys, key)
	}
	return keys
}

func (j JsonMap) Contains(key string) bool {
	if _, ok := j[key]; ok {
		return true
	}
	return false
}
