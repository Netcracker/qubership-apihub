package view

type SpectralResultSummary struct {
	ErrorCount   int `json:"errorCount"`
	WarningCount int `json:"warningCount"`
	InfoCount    int `json:"infoCount"`
	HintCount    int `json:"hintCount"`
}

type SpectralDocumentValidationEntity struct {
	Filename        string
	Summary         SpectralResultSummary
	Report          []interface{}
	CalculationTime int64
	Details         string
}

type SpectralOutputItem struct {
	Code     string   `json:"code"`
	Path     []string `json:"path"`
	Message  string   `json:"message"`
	Severity int      `json:"severity"`
	Range    struct {
		Start struct {
			Line      int `json:"line"`
			Character int `json:"character"`
		} `json:"start"`
		End struct {
			Line      int `json:"line"`
			Character int `json:"character"`
		} `json:"end"`
	} `json:"range"`
	Source string `json:"source"`
}

func ConvertSpectralSeverityToString(severity int) string {
	switch severity {
	case 0:
		return "error"
	case 1:
		return "warning"
	case 2:
		return "info"
	case 3:
		return "hint"
	}
	return "unknown"
}
