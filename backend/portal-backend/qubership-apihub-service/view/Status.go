package view

type Status struct {
	Status string `json:"status"`
}

type Statuses_deprecated struct {
	Statuses []string `json:"statuses"`
}
