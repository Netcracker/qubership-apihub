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
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type BuildProcessorService interface {
	GetFreeBuild(builderId string) (*view.BuildConfig, []byte, error)
}

func NewBuildProcessorService(buildRepository repository.BuildRepository, refResolverService RefResolverService) BuildProcessorService {
	bp := &buildProcessorServiceImpl{
		buildRepository: buildRepository,

		refResolverService: refResolverService,
	}

	return bp
}

type buildProcessorServiceImpl struct {
	buildRepository repository.BuildRepository

	refResolverService RefResolverService
}

func (b *buildProcessorServiceImpl) GetFreeBuild(builderId string) (*view.BuildConfig, []byte, error) {
	buildSrc, err := b.findFreeBuild(builderId) // find not started build
	if err != nil {
		return nil, nil, err
	}
	if buildSrc == nil {
		return nil, nil, nil
	}

	config, err := view.BuildConfigFromMap(buildSrc.Config, buildSrc.BuildId)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to parse build config: %s", err)
	}
	return config, buildSrc.Source, nil
}

func (b *buildProcessorServiceImpl) findFreeBuild(builderId string) (*entity.BuildSourceEntity, error) {
	var buildSrc *entity.BuildSourceEntity
	var build *entity.BuildEntity
	var err error

	for {
		start := time.Now()
		build, err = b.buildRepository.FindAndTakeFreeBuild(builderId)
		utils.PerfLog(time.Since(start).Milliseconds(), 250, "findFreeBuild: FindAndTakeFreeBuild")
		if err != nil {
			return nil, err
		}
		if build == nil {
			break
		}

		start = time.Now()
		src, err := b.buildRepository.GetBuildSrc(build.BuildId)

		if err != nil {
			return nil, err
		}
		if src == nil {
			utils.PerfLog(time.Since(start).Milliseconds(), 200, "findFreeBuild: GetBuildSrc")
			start = time.Now()
			err = b.buildRepository.UpdateBuildStatus(build.BuildId, view.StatusError, "BE error: sources not found during findFreeBuild")
			utils.PerfLog(time.Since(start).Milliseconds(), 200, "findFreeBuild: UpdateBuildStatus")
			if err != nil {
				return nil, err
			}
			continue
		}

		srcConfig, err := view.BuildConfigFromMap(src.Config, src.BuildId)
		if err != nil {
			err = b.buildRepository.UpdateBuildStatus(src.BuildId, view.StatusError, fmt.Sprintf("Build config has invalid format: %v", err.Error()))
			if err != nil {
				return nil, err
			}
			continue
		}
		utils.PerfLog(time.Since(start).Milliseconds(), 200, "findFreeBuild: GetBuildSrc")

		if srcConfig.UnresolvedRefs {
			start = time.Now()
			srcConfig.Refs, err = b.refResolverService.CalculateBuildConfigRefs(srcConfig.Refs, srcConfig.ResolveRefs, srcConfig.ResolveConflicts)
			if err != nil {
				err = b.buildRepository.UpdateBuildStatus(src.BuildId, view.StatusError, fmt.Sprintf("Build config has invalid refs: %v", err.Error()))
				if err != nil {
					return nil, err
				}
				continue
			}
			srcConfig.UnresolvedRefs = false
			configAsMap, err := view.BuildConfigToMap(*srcConfig)
			if err != nil {
				err = b.buildRepository.UpdateBuildStatus(src.BuildId, view.StatusError, fmt.Sprintf("Failed to parse build src config as map: %v", err.Error()))
				if err != nil {
					return nil, err
				}
				continue
			}
			err = b.buildRepository.UpdateBuildSourceConfig(src.BuildId, *configAsMap)
			if err != nil {
				err = b.buildRepository.UpdateBuildStatus(src.BuildId, view.StatusError, fmt.Sprintf("Failed to update build config: %v", err.Error()))
				if err != nil {
					return nil, err
				}
				continue
			}
			src.Config = *configAsMap
			utils.PerfLog(time.Since(start).Milliseconds(), 200, "findFreeBuild: CalculateBuildConfigRefs")
		}
		buildSrc = src
		break
	}
	return buildSrc, nil
}
