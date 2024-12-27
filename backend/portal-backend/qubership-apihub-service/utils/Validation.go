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

import (
	"fmt"
	"net/http"
	"reflect"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func getValidator() *validator.Validate {
	if validate == nil {
		validate = validator.New()
	}
	return validate
}

func ValidateObject(object interface{}) error {
	err := getValidator().Struct(object)
	if err == nil {
		return nil
	}
	missingParams := make([]string, 0) //todo do not add or remove duplicate fields (e.g. arrays validations)
	for _, err := range err.(validator.ValidationErrors) {
		if err.Tag() == "required" {
			missingParams = append(missingParams, err.StructNamespace())
		}
	}
	if len(missingParams) == 0 {
		return nil
	}
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.RequiredParamsMissing,
		Message: exception.RequiredParamsMissingMsg,
		Params:  map[string]interface{}{"params": strings.Join(getValidatedValuesTags(object, missingParams), ", ")},
	}
}

func getValidatedValuesTags(b interface{}, targetNames []string) []string {
	//TODO: doesn't work for documents
	result := make([]string, 0)
	for i := 0; i < len(targetNames); i++ {
		reflectValue := reflect.ValueOf(b)
		//split and remove Highest struct name
		splitName := strings.Split(targetNames[i], ".")[1:]
		fullErrorName := getTagReflective(reflectValue.Type(), splitName, "")
		result = append(result, fullErrorName)
	}

	return result
}

func getTagReflective(value reflect.Type, splitName []string, name string) string {
	currentElem, splitName := splitName[0], splitName[1:]
	currentElemSplit := strings.Split(currentElem, "[")
	arrayIndex := ""
	isArr := false
	if len(currentElemSplit) > 1 {
		arrayIndex = strings.Split(currentElemSplit[1], "]")[0]
		isArr = true
	}
	for i := 0; i < value.NumField(); i++ {
		t := value.Field(i)

		if t.Name != currentElemSplit[0] {
			continue
		}

		if len(splitName) > 0 {
			if name == "" {
				name = getJsonTag(t, arrayIndex, isArr)
			} else {
				name = name + "." + getJsonTag(t, arrayIndex, isArr)
			}

			var nextValueType reflect.Type
			switch os := t.Type.Kind(); os {
			case reflect.Struct:
				nextValueType = t.Type

			case reflect.Slice:
				nextValueType = t.Type.Elem()

			case reflect.Pointer:
				switch pointerType := t.Type.Elem().Kind(); pointerType {
				case reflect.Struct:
					nextValueType = t.Type.Elem()
				case reflect.Slice:
					nextValueType = t.Type.Elem().Elem()
				default:
					nextValueType = t.Type.Elem()
				}
			default:
				nextValueType = t.Type
			}
			return getTagReflective(nextValueType, splitName, name)
		} else {

			if name == "" {
				return getJsonTag(t, arrayIndex, isArr)
			} else {
				return name + "." + getJsonTag(t, arrayIndex, isArr)
			}
		}
	}
	return ""
}

func getJsonTag(field reflect.StructField, arrayIndex string, isArr bool) string {
	jsonTag := field.Tag.Get("json")
	fieldName := ""
	switch jsonTag {
	case "-", "":
		fieldName = field.Name
	default:
		parts := strings.Split(jsonTag, ",")
		fieldName = parts[0]
		if fieldName == "" {
			fieldName = field.Name
		}
	}
	if isArr {
		return fmt.Sprintf("%s[%s]", fieldName, arrayIndex)
	} else {
		return fieldName
	}
}
