package service

import (
	"context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type BusinessMetricService interface {
	GetBusinessMetrics(ctx context.Context, parentPackageId string, hierarchyLevel int) ([]view.BusinessMetric, error)
}

func NewBusinessMetricService(businessMetricRepo repository.BusinessMetricRepository) BusinessMetricService {

	return businessMetricServiceImpl{
		businessMetricRepo: businessMetricRepo,
	}
}

type businessMetricServiceImpl struct {
	businessMetricRepo repository.BusinessMetricRepository
}

func (b businessMetricServiceImpl) GetBusinessMetrics(ctx context.Context, parentPackageId string, hierarchyLevel int) ([]view.BusinessMetric, error) {
	businessMetricEnts, err := b.businessMetricRepo.GetBusinessMetrics(ctx, parentPackageId, hierarchyLevel)
	if err != nil {
		return nil, err
	}
	businessMetrics := make([]view.BusinessMetric, 0)
	for _, businessMetric := range businessMetricEnts {
		businessMetrics = append(businessMetrics, entity.MakeBusinessMetricView(businessMetric))
	}
	return businessMetrics, nil
}
