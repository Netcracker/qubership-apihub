package view

type Job struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

func ConvertJobName(name string) string {
	switch name {
	case "revisions_cleanup":
		return "auto-cleaning job"
	}
	return name
}