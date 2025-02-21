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
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/robfig/cron/v3"
	log "github.com/sirupsen/logrus"
)

// FIXME: not used!!!
type MetricsService interface {
	CreateJob(schedule string) error
}

func NewMetricsService(metricsRepository repository.MetricsRepository) MetricsService {
	return &metricsServiceImpl{
		metricsRepository: metricsRepository,
		cron:              cron.New(),
	}
}

type metricsServiceImpl struct {
	metricsRepository  repository.MetricsRepository
	connectionProvider db.ConnectionProvider
	cron               *cron.Cron
}

func (c *metricsServiceImpl) CreateJob(schedule string) error {
	job := MetricsGetterJob{
		schedule:          schedule,
		metricsRepository: c.metricsRepository,
	}

	if len(c.cron.Entries()) == 0 {
		location, err := time.LoadLocation("")
		if err != nil {
			return err
		}
		c.cron = cron.New(cron.WithLocation(location))
		c.cron.Start()
	}

	_, err := c.cron.AddJob(schedule, &job)
	if err != nil {
		log.Warnf("[Metrics service] Job wasn't added for schedule - %s. With error - %s", schedule, err)
		return err
	}
	log.Infof("[Metrics service] Job was created with schedule - %s", schedule)

	return nil
}

type MetricsGetterJob struct {
	schedule          string
	metricsRepository repository.MetricsRepository
}

func (j MetricsGetterJob) Run() {
	err := j.metricsRepository.StartGetMetricsProcess()
	if err != nil {
		log.Errorf("[MetricsGetterJob-Run]  err - %s", err.Error())
	}
}
