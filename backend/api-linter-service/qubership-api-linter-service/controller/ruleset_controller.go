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

package controller

import (
	"net/http"
	"os"
)

type RulesetController interface {
	GetRulesetFile(w http.ResponseWriter, r *http.Request)
	GetJSRulesetFile(w http.ResponseWriter, r *http.Request)
	GetJsonRulesetFile(w http.ResponseWriter, r *http.Request)
}

type rulesetControllerImpl struct{}

func NewRulesetController() RulesetController {
	return &rulesetControllerImpl{}
}

func (c *rulesetControllerImpl) GetRulesetFile(w http.ResponseWriter, r *http.Request) {
	rules, err := os.ReadFile("./resources/spectral/rules/rules.yaml")
	if err != nil {
		respondWithError(w, "failed to read ruleset", err)
		return
	}
	w.Header().Add("Content-Type", "application/yaml; charset=utf-8")
	w.Header().Add("Content-Disposition", "attachment; filename=rules.yaml")
	w.Write(rules)
}

func (c *rulesetControllerImpl) GetJSRulesetFile(w http.ResponseWriter, r *http.Request) {
	rules, err := os.ReadFile("./resources/spectral/rules/rules.js")
	if err != nil {
		respondWithError(w, "failed to read ruleset", err)
		return
	}
	w.Header().Add("Content-Type", "text/javascript; charset=utf-8")
	w.Header().Add("Content-Disposition", "attachment; filename=rules.js")
	w.Write(rules)
}

func (c *rulesetControllerImpl) GetJsonRulesetFile(w http.ResponseWriter, r *http.Request) {
	rules, err := os.ReadFile("./resources/spectral/rules/rules.json")
	if err != nil {
		respondWithError(w, "failed to read ruleset", err)
		return
	}
	w.Header().Add("Content-Type", "application/json; charset=utf-8")
	w.Header().Add("Content-Disposition", "attachment; filename=rules.json")
	w.Write(rules)
}
