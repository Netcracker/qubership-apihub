package view

type ApiConfig struct {
	ConfigUrl string `json:"configUrl"`
	Urls      []Url  `json:"urls"`
}

type Url struct {
	Url  string `json:"url"`
	Name string `json:"name"`
}
