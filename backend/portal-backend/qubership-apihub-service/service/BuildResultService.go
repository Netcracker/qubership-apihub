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
	"context"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type BuildResultService interface {
	StoreBuildResult(buildId string, result []byte) error
	GetBuildResult(buildId string) ([]byte, error)
}

func NewBuildResultService(repo repository.BuildResultRepository, systemInfoService SystemInfoService, minioStorageService MinioStorageService) BuildResultService {
	return &buildResultServiceImpl{
		repo:                repo,
		minioStorageService: minioStorageService,
		systemInfoService:   systemInfoService,
	}
}

type buildResultServiceImpl struct {
	repo                repository.BuildResultRepository
	minioStorageService MinioStorageService
	systemInfoService   SystemInfoService
}

func (b buildResultServiceImpl) StoreBuildResult(buildId string, result []byte) error {
	if b.systemInfoService.IsMinioStorageActive() {
		ctx := context.Background()
		err := b.minioStorageService.UploadFile(ctx, view.BUILD_RESULT_TABLE, buildId, result)
		if err != nil {
			return err
		}
		return nil
	}
	return b.repo.StoreBuildResult(entity.BuildResultEntity{
		BuildId: buildId,
		Data:    result,
	})
}

func (b buildResultServiceImpl) GetBuildResult(buildId string) ([]byte, error) {
	if b.systemInfoService.IsMinioStorageActive() {
		ctx := context.Background()
		content, err := b.minioStorageService.GetFile(ctx, view.BUILD_RESULT_TABLE, buildId)
		if err != nil {
			return nil, err
		}
		return content, nil
	}
	res, err := b.repo.GetBuildResult(buildId)
	if err != nil {
		return nil, err
	}
	return res.Data, nil
}
