package view

type Admins struct {
	Admins []User `json:"admins"`
}

type AddSysadmReq struct {
	UserId string `json:"userId" validate:"required"`
}
