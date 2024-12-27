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
	"path"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type TemplateService interface {
	GetFileTemplate(fileName string, fileType string) string
}

func NewTemplateService() TemplateService {
	return &templateServiceImpl{}
}

type templateServiceImpl struct {
}

func (t templateServiceImpl) GetFileTemplate(fileName string, fileType string) string {
	ext := strings.ToUpper(path.Ext(fileName))
	switch fileType {
	case string(view.OpenAPI30):
		if ext == ".JSON" {
			return getJsonOpenapiTemplate()
		}
		if ext == ".YAML" || ext == ".YML" {
			return getYamlOpenapiTemplate()
		}
	case string(view.MD):
		return getMarkdownTemplate()
	case string(view.JsonSchema):
		if ext == ".JSON" {
			return getJsonJsonSchemaTemplate()
		}
		if ext == ".YAML" || ext == ".YML" {
			return getYamlJsonSchemaTemplate()
		}
	}
	return ""
}

func getMarkdownTemplate() string {
	return `
	# Title
	
	The beginning of an awesome article...
	`
}

func getJsonOpenapiTemplate() string {
	// TODO: load template from resource file
	return ""
}

func getYamlOpenapiTemplate() string {
	// TODO: load template from resource file
	return ""
}

func getYamlJsonSchemaTemplate() string {
	// TODO: load template from resource file
	return `invoice: 34843
date   : 2001-01-23
bill-to: &id001
  given  : Chris
  family : Dumars
  address:
    lines: |
      458 Walkman Dr.
      Suite #292
    city    : Royal Oak
    state   : MI
    postal  : 48046
ship-to: *id001
product:
- sku         : BL394D
  quantity    : 4
  description : Basketball
  price       : 450.00
- sku         : BL4438H
  quantity    : 1
  description : Super Hoop
  price       : 2392.00
tax  : 251.42
total: 4443.52
comments:
  Late afternoon is best.
  Backup contact is Nancy
  Billsmer @ 338-4338.
`
}

func getJsonJsonSchemaTemplate() string {
	// TODO: load template from resource file
	return `{
  "$id": "https://example.com/calendar.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "description": "A representation of an event",
  "type": "object",
  "required": [ "dtstart", "summary" ],
  "properties": {
    "dtstart": {
      "type": "string",
      "description": "Event starting time"
    },
    "dtend": {
      "type": "string",
      "description": "Event ending time"
    },
    "summary": {
      "type": "string"
    },
    "location": {
      "type": "string"
    },
    "url": {
      "type": "string"
    },
    "duration": {
      "type": "string",
      "description": "Event duration"
    },
    "rdate": {
      "type": "string",
      "description": "Recurrence date"
    },
    "rrule": {
      "type": "string",
      "description": "Recurrence rule"
    },
    "category": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "geo": {
      "$ref": "https://example.com/geographical-location.schema.json"
    }
  }
}
`
}
