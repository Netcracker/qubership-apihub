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

package view

import "time"

type SystemInfo struct {
	BackendVersion   string        `json:"backendVersion"`
	InsecureProxy    bool          `json:"-"`
	ApihubUrl        string        `json:"-"`
	AgentUrl         string        `json:"-"`
	AccessToken      string        `json:"-"`
	DiscoveryConfig  string        `json:"-"`
	CloudName        string        `json:"-"`
	AgentNamespace   string        `json:"-"`
	ExcludeLabels    []string      `json:"-"`
	GroupingLabels   []string      `json:"-"`
	AgentName        string        `json:"-"`
	DiscoveryTimeout time.Duration `json:"-"`
}
