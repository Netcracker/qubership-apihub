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

import "testing"

func TestPaginateList(t *testing.T) {

	startIndex, endIndex := PaginateList(100, 10, 1)
	if startIndex != 10 || endIndex != 20 {
		t.Errorf("Expected start index: 10, end index: 20; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(100, 10, 3)
	if startIndex != 30 || endIndex != 40 {
		t.Errorf("Expected start index: 30, end index: 40; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(100, 10, 10)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(0, 10, 1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, 0, 1)
	if startIndex != 0 || endIndex != 10 {
		t.Errorf("Expected start index: 0, end index: 10; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, 10, 0)
	if startIndex != 0 || endIndex != 10 {
		t.Errorf("Expected start index: 0, end index: 10; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, -10, 1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, 10, -1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(-10, 10, 1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(0, -10, -1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(-10, 0, -1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, -10, 1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(10, 10, -1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(-10, 10, 1)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}

	startIndex, endIndex = PaginateList(0, 0, 0)
	if startIndex != 0 || endIndex != 0 {
		t.Errorf("Expected start index: 0, end index: 0; Got start index: %d, end index: %d", startIndex, endIndex)
	}
}
