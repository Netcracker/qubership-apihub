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

func PaginateList(listSize int, limit int, page int) (int, int) {
	// page count starts with 0
	if limit < 0 || page < 0 {
		return 0, 0
	}
	if limit == 0 {
		return 0, listSize
	}
	startIndex := (page) * limit
	endIndex := startIndex + limit

	if startIndex >= listSize {
		return 0, 0 // Return invalid indices if start index is out of range
	}

	if endIndex > listSize {
		endIndex = listSize // Adjust end index to the last index if it exceeds the list size
	}

	return startIndex, endIndex
}
