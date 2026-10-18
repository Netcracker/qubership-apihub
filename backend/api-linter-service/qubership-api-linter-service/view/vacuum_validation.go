package view

type ValidationResult struct {
}

type ValidationData struct {
	DataHash string
	Data     []byte
}

type VacuumReport struct {
	ResultSet  VacuumResultSet        `json:"resultSet"`
	Statistics map[string]interface{} `json:"statistics"`
}

type VacuumResultSet struct {
	VacuumResultSummary
	Results []interface{} `json:"results"`
}

type VacuumResultSummary struct {
	ErrorCount   int `json:"errorCount"`
	WarningCount int `json:"warningCount"`
	InfoCount    int `json:"infoCount"`
	HintCount    int `json:"hintCount"`
}

type DocumentValidationEntity struct {
	Filename        string
	Summary         map[string]interface{}
	Report          []interface{}
	CalculationTime int64
	Details         string
}

type OperationValidationEntity struct {
	DataHash        string
	Summary         map[string]interface{}
	Report          []interface{}
	CalculationTime int64
	Details         string
}
