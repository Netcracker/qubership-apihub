package repository

import (
	"fmt"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/db"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
)

type BusinessMetricRepository interface {
	GetBusinessMetrics(parentPackageId string, hierarchyLevel int) ([]entity.BusinessMetricEntity, error)
}

func NewBusinessMetricRepository(cp db.ConnectionProvider) BusinessMetricRepository {
	return businessMetricRepositoryImpl{
		cp: cp,
	}
}

type businessMetricRepositoryImpl struct {
	cp db.ConnectionProvider
}

func (b businessMetricRepositoryImpl) GetBusinessMetrics(parentPackageId string, hierarchyLevel int) ([]entity.BusinessMetricEntity, error) {
	result := make([]entity.BusinessMetricEntity, 0)
	packageGroupCol := `d.key::varchar`
	if hierarchyLevel > 0 {
		packageGroupCol = `(string_to_array(d.key::varchar, '.'))[1]`
		for level := 2; level <= hierarchyLevel; level++ {
			packageGroupCol = fmt.Sprintf(`%s || coalesce(('.' || (string_to_array(d.key::varchar, '.'))[%d]), '')`, packageGroupCol, level)
		}
	}
	businessMetricsQuery := fmt.Sprintf(`
	select 
	to_date(year || '-' || month || '-' || day, 'YYYY-MM-DD')::varchar as date,
	%s as package_id,
	coalesce(u.name, b.user_id) as username,
	metric,
	sum(d.value::int) as value
	from business_metric b left join user_data u on b.user_id = u.user_id,
	jsonb_each_text(data) d 
	where (? = '' or d.key::varchar ilike ? || '.%%')
	group by 1, 2, 3, 4
	order by 1, 2
	`, packageGroupCol)

	_, err := b.cp.GetConnection().Query(&result, businessMetricsQuery, parentPackageId, parentPackageId)
	if err != nil {
		return nil, err
	}
	return result, nil
}
