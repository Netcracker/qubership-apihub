package entity

import "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"

type BusinessMetricEntity struct {
	Date      string `pg:"date, type:varchar"`
	PackageId string `pg:"package_id, type:varchar"`
	Metric    string `pg:"metric, type:varchar"`
	Username  string `pg:"username, type:varchar"`
	Value     int    `pg:"value, type:integer"`
}

func MakeBusinessMetricView(ent BusinessMetricEntity) view.BusinessMetric {
	return view.BusinessMetric{
		Date:      ent.Date,
		PackageId: ent.PackageId,
		Username:  ent.Username,
		Metric:    ent.Metric,
		Value:     ent.Value,
	}
}
