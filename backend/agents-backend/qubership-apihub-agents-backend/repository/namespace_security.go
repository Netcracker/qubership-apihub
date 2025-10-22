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

package repository

import (
	"github.com/Netcracker/qubership-apihub-agents-backend/db"
	"github.com/Netcracker/qubership-apihub-agents-backend/entity"
	"github.com/Netcracker/qubership-apihub-agents-backend/view"
	"github.com/go-pg/pg/v10"
)

type NamespaceSecurityRepository interface {
	SaveNamespaceSecurityCheck(ent *entity.NamespaceSecurityCheckEntity) error
	UpdateNamespaceSecurityCheckStatus(ent *entity.NamespaceSecurityCheckEntity) error
	SaveNamespaceSecurityCheckService(service *entity.NamespaceSecurityCheckServiceEntity) error
	SaveNamespaceSecurityCheckServices(services []entity.NamespaceSecurityCheckServiceEntity) error
	UpdateNamespaceSecurityCheckService(service *entity.NamespaceSecurityCheckServiceEntity) error
	GetServicesForNamespaceSecurityCheck(processId string) ([]entity.NamespaceSecurityCheckServiceEntity, error)
	SaveNamespaceSecurityCheckResults(results []entity.NamespaceSecurityCheckResultEntity) error
	GetNamespaceSecurityCheckResults(processId string) ([]entity.NamespaceSecurityCheckResultEntity, error)
	GetNamespaceSecurityCheckReports(agentId string, namespace string, workspaceId string, limit int, page int) ([]entity.NamespaceSecurityCheckStatusEntity, error)
	GetNamespaceSecurityCheckStatus(processId string) (*entity.NamespaceSecurityCheckStatusEntity, error)
}

func NewNamespaceSecurityRepository(cp db.ConnectionProvider) NamespaceSecurityRepository {
	return &namespaceSecurityRepositoryImpl{cp: cp}
}

type namespaceSecurityRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (n namespaceSecurityRepositoryImpl) SaveNamespaceSecurityCheck(ent *entity.NamespaceSecurityCheckEntity) error {
	_, err := n.cp.GetConnection().Model(ent).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (n namespaceSecurityRepositoryImpl) UpdateNamespaceSecurityCheckStatus(ent *entity.NamespaceSecurityCheckEntity) error {
	_, err := n.cp.GetConnection().Model(ent).
		Set("status = ?status").
		Set("details = ?details").
		Set("finished_at = ?finished_at").
		WherePK().
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (n namespaceSecurityRepositoryImpl) SaveNamespaceSecurityCheckService(service *entity.NamespaceSecurityCheckServiceEntity) error {
	_, err := n.cp.GetConnection().Model(service).OnConflict("(process_id, service_id) DO UPDATE").Insert()
	if err != nil {
		return err
	}
	return nil
}

func (n namespaceSecurityRepositoryImpl) SaveNamespaceSecurityCheckServices(services []entity.NamespaceSecurityCheckServiceEntity) error {
	_, err := n.cp.GetConnection().Model(&services).OnConflict("(process_id, service_id) DO UPDATE").Insert()
	if err != nil {
		return err
	}
	return nil
}

func (n namespaceSecurityRepositoryImpl) UpdateNamespaceSecurityCheckService(service *entity.NamespaceSecurityCheckServiceEntity) error {
	_, err := n.cp.GetConnection().Model(service).
		WherePK().
		Update()
	if err != nil {
		return err
	}
	return nil
}

func (n namespaceSecurityRepositoryImpl) GetServicesForNamespaceSecurityCheck(processId string) ([]entity.NamespaceSecurityCheckServiceEntity, error) {
	result := make([]entity.NamespaceSecurityCheckServiceEntity, 0)
	err := n.cp.GetConnection().Model(&result).
		Where("process_id = ?", processId).
		Order("service_id").
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (n namespaceSecurityRepositoryImpl) SaveNamespaceSecurityCheckResults(results []entity.NamespaceSecurityCheckResultEntity) error {
	_, err := n.cp.GetConnection().Model(&results).Insert()
	if err != nil {
		return err
	}
	return nil
}

func (n namespaceSecurityRepositoryImpl) GetNamespaceSecurityCheckResults(processId string) ([]entity.NamespaceSecurityCheckResultEntity, error) {
	result := make([]entity.NamespaceSecurityCheckResultEntity, 0)
	err := n.cp.GetConnection().Model(&result).
		Where("process_id = ?", processId).
		Order("service_id", "method", "path").
		Select()
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (n namespaceSecurityRepositoryImpl) GetNamespaceSecurityCheckReports(agentId string, namespace string, workspaceId string, limit int, page int) ([]entity.NamespaceSecurityCheckStatusEntity, error) {
	result := make([]entity.NamespaceSecurityCheckStatusEntity, 0)
	query := `
	with processed as(
		select process_id, count(*) cnt
		from namespace_security_check_service
		where status in(?)
		group by process_id
	),
	total as(
		select process_id, count(*) cnt
		from namespace_security_check_service
		group by process_id
	)
	select coalesce(t.cnt, 0) services_total, coalesce(p.cnt, 0) services_processed, n.* from
	namespace_security_check n
	left join processed p on
	n.process_id = p.process_id
	left join total t on
	n.process_id = t.process_id
	where (? = '' or n.agent_id = ?)
	and (? = '' or n.namespace = ?)
	and (? = '' or n.workspace_id = ?)
	order by n.started_at desc, n.process_id
	limit ?
	offset ?;
	`
	_, err := n.cp.GetConnection().Query(&result, query,
		pg.In([]string{string(view.StatusComplete), string(view.StatusError)}),
		agentId, agentId,
		namespace, namespace,
		workspaceId, workspaceId,
		limit, limit*page)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (n namespaceSecurityRepositoryImpl) GetNamespaceSecurityCheckStatus(processId string) (*entity.NamespaceSecurityCheckStatusEntity, error) {
	result := new(entity.NamespaceSecurityCheckStatusEntity)
	query := `

	with processed as(
		select process_id, count(*) cnt
		from namespace_security_check_service
		where status in(?)
		group by process_id
	),
	total as(
		select process_id, count(*) cnt
		from namespace_security_check_service
		group by process_id
	)
	select coalesce(t.cnt, 0) services_total, coalesce(p.cnt, 0) services_processed, n.* from
	namespace_security_check n
	left join processed p on
	n.process_id = p.process_id
	left join total t on
	n.process_id = t.process_id
	where n.process_id = ?;
	`
	_, err := n.cp.GetConnection().QueryOne(result, query,
		pg.In([]string{string(view.StatusComplete), string(view.StatusError)}), processId)
	if err != nil {
		if err == pg.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}
