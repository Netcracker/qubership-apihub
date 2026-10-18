package view

type PublishV2Response struct {
	PublishId string       `json:"publishId"`
	Config    *BuildConfig `json:"config,omitempty"`
}
