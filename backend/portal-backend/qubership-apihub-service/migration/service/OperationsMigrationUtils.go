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
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
)

var downMigrationFileRegexp = regexp.MustCompile(`^[0-9]+_.+\.down\.sql$`)
var upMigrationFileRegexp = regexp.MustCompile(`^[0-9]+_.+\.up\.sql$`)

func (d *dbMigrationServiceImpl) getMigrationFilenamesMap() (map[int]string, map[int]string, error) {
	folder, err := os.Open(d.migrationsFolder)
	if err != nil {
		return nil, nil, err
	}
	defer folder.Close()
	fileNames, err := folder.Readdirnames(-1)
	if err != nil {
		return nil, nil, err
	}
	upMigrations := make(map[int]string, 0)
	downMigrations := make(map[int]string, 0)
	maxUpMigrationNumber := -1
	for _, file := range fileNames {
		if upMigrationFileRegexp.MatchString(file) {
			num, _ := strconv.Atoi(strings.Split(file, `_`)[0])
			if _, exists := upMigrations[num]; exists {
				return nil, nil, fmt.Errorf("found duplicate migration number, migration is not possible: %v", file)
			}
			upMigrations[num] = filepath.Join(d.migrationsFolder, file)
			if maxUpMigrationNumber < num {
				maxUpMigrationNumber = num
			}
		}
		if downMigrationFileRegexp.MatchString(file) {
			num, _ := strconv.Atoi(strings.Split(file, `_`)[0])
			if _, exists := downMigrations[num]; exists {
				return nil, nil, fmt.Errorf("found duplicate migration number, migration is not possible: %v", file)
			}
			downMigrations[num] = filepath.Join(d.migrationsFolder, file)
		}
	}
	if maxUpMigrationNumber != len(upMigrations) {
		return nil, nil, fmt.Errorf("highest migration number (%v) should be equal to a total number of migrations (%v)", maxUpMigrationNumber, len(upMigrations))
	}
	for num := range downMigrations {
		if _, exists := upMigrations[num]; !exists {
			return nil, nil, fmt.Errorf("down migration '%v' doesn't belong to any of up migrations", downMigrations[num])
		}
	}
	return upMigrations, downMigrations, nil
}

func calculateMigrationHash(migrationNum int, data []byte) string {
	return utils.GetEncodedChecksum([]byte(strconv.Itoa(migrationNum)), data)
}
