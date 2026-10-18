package view

type BusinessMetric struct {
	Date      string `json:"date"`
	PackageId string `json:"packageId"`
	Metric    string `json:"metric"`
	Username  string `json:"username"`
	Value     int    `json:"value"`
}
