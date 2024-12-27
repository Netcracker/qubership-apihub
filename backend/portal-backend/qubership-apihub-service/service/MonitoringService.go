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
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/go-pg/pg/v10"
	log "github.com/sirupsen/logrus"
)

type MonitoringService interface {
	AddVersionOpenCount(packageId string, version string)
	AddDocumentOpenCount(packageId string, version string, slug string)
	AddOperationOpenCount(packageId string, version string, operationId string)
	IncreaseBusinessMetricCounter(userId string, metric string, key string)
	AddEndpointCall(path string, options interface{})
}

func NewMonitoringService(cp db.ConnectionProvider) MonitoringService {
	monitoringService := &monitoringServiceImpl{
		versionOpenCount:     make(map[string]int),
		documentOpenCount:    make(map[string]int),
		operationOpenCount:   make(map[string]int),
		businessMetrics:      make(map[string]map[string]map[string]int),
		endpointCalls:        make(map[string]map[string]interface{}),
		endpointCallsCount:   make(map[string]map[string]int),
		versionOCMutex:       &sync.RWMutex{},
		documentOCMutex:      &sync.RWMutex{},
		operationOCMutex:     &sync.RWMutex{},
		businessMetricsMutex: &sync.RWMutex{},
		endpointCallsMutex:   &sync.RWMutex{},
		cp:                   cp,
	}
	monitoringService.startPeriodicFlushJob(time.Minute * 5)
	return monitoringService
}

type monitoringServiceImpl struct {
	cp                   db.ConnectionProvider
	versionOpenCount     map[string]int
	versionOCMutex       *sync.RWMutex
	documentOpenCount    map[string]int
	documentOCMutex      *sync.RWMutex
	operationOpenCount   map[string]int
	operationOCMutex     *sync.RWMutex
	businessMetrics      map[string]map[string]map[string]int
	businessMetricsMutex *sync.RWMutex
	endpointCalls        map[string]map[string]interface{}
	endpointCallsCount   map[string]map[string]int
	endpointCallsMutex   *sync.RWMutex
}

func (m *monitoringServiceImpl) AddVersionOpenCount(packageId string, version string) {
	utils.SafeAsync(func() {
		versionKey := getVersionKey(packageId, version)
		m.versionOCMutex.Lock()
		defer m.versionOCMutex.Unlock()
		m.versionOpenCount[versionKey]++
	})
}

func getVersionKey(packageId string, version string) string {
	if strings.Contains(version, "@") {
		version = strings.Split(version, "@")[0]
	}
	return packageId + stringSeparator + version
}

func splitVersionKey(versionKey string) (string, string) {
	versionKeySplit := strings.Split(versionKey, stringSeparator)
	return versionKeySplit[0], versionKeySplit[1]
}

func (m *monitoringServiceImpl) AddDocumentOpenCount(packageId string, version string, slug string) {
	utils.SafeAsync(func() {
		documentKey := getDocumentKey(packageId, version, slug)
		m.documentOCMutex.Lock()
		defer m.documentOCMutex.Unlock()
		m.documentOpenCount[documentKey]++
	})
}

func getDocumentKey(packageId string, version string, slug string) string {
	if strings.Contains(version, "@") {
		version = strings.Split(version, "@")[0]
	}
	return packageId + stringSeparator + version + stringSeparator + slug
}

func splitDocumentKey(documentKey string) (string, string, string) {
	documentKeySplit := strings.Split(documentKey, stringSeparator)
	return documentKeySplit[0], documentKeySplit[1], documentKeySplit[2]
}

func (m *monitoringServiceImpl) AddOperationOpenCount(packageId string, version string, operationId string) {
	utils.SafeAsync(func() {
		operationKey := getOperationKey(packageId, version, operationId)
		m.operationOCMutex.Lock()
		defer m.operationOCMutex.Unlock()
		m.operationOpenCount[operationKey]++
	})
}

func getOperationKey(packageId string, version string, operationId string) string {
	if strings.Contains(version, "@") {
		version = strings.Split(version, "@")[0]
	}
	return packageId + stringSeparator + version + stringSeparator + operationId
}

func splitOperationKey(operationKey string) (string, string, string) {
	operationKeySplit := strings.Split(operationKey, stringSeparator)
	return operationKeySplit[0], operationKeySplit[1], operationKeySplit[2]
}

func (m *monitoringServiceImpl) startPeriodicFlushJob(interval time.Duration) {
	utils.SafeAsync(func() {
		for {
			time.Sleep(interval)
			err := m.flushOpenCount()
			if err != nil {
				log.Errorf("PeriodicFlushJob failed to flush open count to db: %v", err.Error())
			}
			err = m.flushBusinessMetrics()
			if err != nil {
				log.Errorf("PeriodicFlushJob failed to flush business metrics to db: %v", err.Error())
			}
			err = m.flushEndpointCalls()
			if err != nil {
				log.Errorf("PeriodicFlushJob failed to flush endpoint calls to db: %v", err.Error())
			}
		}
	})
}

func (m *monitoringServiceImpl) flushOpenCount() error {
	if len(m.versionOpenCount) == 0 && len(m.documentOpenCount) == 0 && len(m.operationOpenCount) == 0 {
		return nil
	}
	m.versionOCMutex.Lock()
	m.documentOCMutex.Lock()
	m.operationOCMutex.Lock()
	defer m.versionOCMutex.Unlock()
	defer m.documentOCMutex.Unlock()
	defer m.operationOCMutex.Unlock()

	ctx := context.Background()
	err := m.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		versionOpenCountInsertQuery := `
		insert into published_version_open_count as pv
		values (?, ?, ?)
		on conflict (package_id, version) do update
		set open_count = pv.open_count + ?`
		for versionKey, openCount := range m.versionOpenCount {
			packageId, version := splitVersionKey(versionKey)
			_, err := tx.Exec(versionOpenCountInsertQuery, packageId, version, openCount, openCount)
			if err != nil {
				return err
			}
		}
		documentOpenCountInsertQuery := `
		insert into published_document_open_count as pd
		values (?, ?, ?, ?)
		on conflict (package_id, version, slug) do update
		set open_count = pd.open_count + ?`
		for documentKey, openCount := range m.documentOpenCount {
			packageId, version, slug := splitDocumentKey(documentKey)
			_, err := tx.Exec(documentOpenCountInsertQuery, packageId, version, slug, openCount, openCount)
			if err != nil {
				return err
			}
		}
		operationOpenCountInsertQuery := `
		insert into operation_open_count as o
		values (?, ?, ?, ?)
		on conflict (package_id, version, operation_id) do update
		set open_count = o.open_count + ?`
		for operationKey, openCount := range m.operationOpenCount {
			packageId, version, operationId := splitOperationKey(operationKey)
			_, err := tx.Exec(operationOpenCountInsertQuery, packageId, version, operationId, openCount, openCount)
			if err != nil {
				return err
			}
		}
		return nil
	})
	m.versionOpenCount = make(map[string]int)
	m.documentOpenCount = make(map[string]int)
	m.operationOpenCount = make(map[string]int)
	return err
}

func (m *monitoringServiceImpl) IncreaseBusinessMetricCounter(userId string, metric string, key string) {
	utils.SafeAsync(func() {
		m.businessMetricsMutex.Lock()
		defer m.businessMetricsMutex.Unlock()
		if _, userMetricExists := m.businessMetrics[userId]; !userMetricExists {
			m.businessMetrics[userId] = map[string]map[string]int{metric: {key: 1}}
		} else {
			if _, metricExists := m.businessMetrics[userId][metric]; !metricExists {
				m.businessMetrics[userId][metric] = map[string]int{key: 1}
			} else {
				if _, keyExists := m.businessMetrics[userId][metric][key]; keyExists {
					m.businessMetrics[userId][metric][key]++
				} else {
					m.businessMetrics[userId][metric][key] = 1
				}
			}
		}
	})
}

func (m *monitoringServiceImpl) flushBusinessMetrics() error {
	if len(m.businessMetrics) == 0 {
		return nil
	}
	m.businessMetricsMutex.Lock()
	defer m.businessMetricsMutex.Unlock()

	insertQuery := `
			insert into business_metric
			values (?, ?, ?, ?, ?, ?)
			on conflict (year, month, day, user_id, metric)
			do update 
			set data = coalesce(business_metric.data, '{}') || (
				SELECT jsonb_object_agg(key, coalesce((business_metric.data ->> key)::int, 0) + coalesce(value::int, 0))
				from jsonb_each_text(EXCLUDED.data)
				);`

	timeNow := time.Now()
	year := timeNow.Year()
	month := timeNow.Month()
	day := timeNow.Day()

	ctx := context.Background()
	err := m.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for userId, metrics := range m.businessMetrics {
			if len(metrics) == 0 {
				continue
			}
			for metric, values := range metrics {
				if len(values) == 0 {
					continue
				}
				_, err := tx.Exec(insertQuery, year, month, day, metric, values, userId)
				if err != nil {
					return fmt.Errorf("failed to insert business metric %s: %w", metric, err)
				}
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	m.businessMetrics = make(map[string]map[string]map[string]int)
	return nil
}

func (m *monitoringServiceImpl) AddEndpointCall(path string, options interface{}) {
	utils.SafeAsync(func() {
		m.endpointCallsMutex.Lock()
		defer m.endpointCallsMutex.Unlock()
		jsonBytes, _ := json.Marshal(options)
		hashBytes := sha1.Sum(jsonBytes)
		optionsHash := hex.EncodeToString(hashBytes[:])
		if _, pathExists := m.endpointCallsCount[path]; !pathExists {
			m.endpointCallsCount[path] = map[string]int{optionsHash: 1}
			m.endpointCalls[path] = map[string]interface{}{optionsHash: options}
		} else {
			m.endpointCallsCount[path][optionsHash]++
			if _, exists := m.endpointCalls[path][optionsHash]; !exists {
				m.endpointCalls[path][optionsHash] = options
			}
		}
	})
}

func (m *monitoringServiceImpl) flushEndpointCalls() error {
	if len(m.endpointCalls) == 0 {
		return nil
	}
	m.endpointCallsMutex.Lock()
	defer m.endpointCallsMutex.Unlock()

	insertQuery := `
			insert into endpoint_calls as ec
			values (?, ?, ?, ?)
			on conflict (path, hash) do update 
			set count = ec.count + ?;`

	ctx := context.Background()
	err := m.cp.GetConnection().RunInTransaction(ctx, func(tx *pg.Tx) error {
		for path, options := range m.endpointCalls {
			for hash, optionsObj := range options {
				count := m.endpointCallsCount[path][hash]
				_, err := tx.Exec(insertQuery, path, hash, optionsObj, count, count)
				if err != nil {
					return fmt.Errorf("failed to insert endpoint calls for %s with options %+v: %w", path, optionsObj, err)
				}
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	m.endpointCalls = make(map[string]map[string]interface{})
	m.endpointCallsCount = make(map[string]map[string]int)
	return nil
}
