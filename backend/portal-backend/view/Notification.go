package view

type Notifications struct {
	Notifications []Notification `json:"notifications"`
}

type Notification struct {
	Category   string `json:"category"`
	Severity   string `json:"severity"`
	Message    string `json:"message"`
	DocumentId string `json:"documentId,omitempty"`
}

type NotificationsFilter struct {
	DocumentId      string
	EmptyDocumentId bool
	Severities      []string
	Categories      []string
	Limit           int
	Offset          int
}
