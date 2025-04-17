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
	"io"
	"net/http"
	"os"
	"path"

	"github.com/Netcracker/qubership-api-linter-service/service"
	log "github.com/sirupsen/logrus"
)

type ValidationController interface {
	ValidateAPI(w http.ResponseWriter, r *http.Request)
}

func NewValidationController(validationService service.ValidationService) ValidationController {
	return &validationControllerImpl{validationService: validationService}
}

type validationControllerImpl struct {
	validationService service.ValidationService
}

func (v *validationControllerImpl) ValidateAPI(w http.ResponseWriter, r *http.Request) {
	validationEngine := r.URL.Query().Get("engine")
	if validationEngine == "" {
		validationEngine = "vacuum"
	}
	files := make([]string, 0)
	r.ParseMultipartForm(0)
	defer func() {
		err := r.MultipartForm.RemoveAll()
		if err != nil {
			log.Debugf("failed to remove multipart form temp data: %s", err.Error())
		}
	}()
	defer func() {
		for _, f := range files {
			err := os.Remove(path.Join(os.TempDir(), f))
			if err != nil {
				log.Errorf("failed to remove temp files: %s", err.Error())
			}
		}
	}()

	for _, fileHeaders := range r.MultipartForm.File {
		for _, fileHeader := range fileHeaders {
			tmpFile, err := os.Create(path.Join(os.TempDir(), fileHeader.Filename))
			if err != nil {
				respondWithError(w, "Failed to create temp directory for received file(s)", err)
				return
			}
			defer tmpFile.Close()

			file, err := fileHeader.Open()
			if err != nil {
				respondWithError(w, "Failed to read received file(s)", err)
				return
			}
			defer file.Close()

			written, err := io.CopyBuffer(tmpFile, file, nil) // copies file with 32KB buffer
			if err != nil {
				log.Errorf("failed to copy file %s (bytes written=%d): %s", fileHeader.Filename, written, err.Error())
				respondWithError(w, "failed to copy file", err)
				return
			}

			files = append(files, fileHeader.Filename)
		}
	}
	report, err := v.validationService.Validate(validationEngine, files)
	if err != nil {
		respondWithError(w, "Failed to calculate report", err)
		return
	}
	respondWithJson(w, http.StatusOK, report)
}
