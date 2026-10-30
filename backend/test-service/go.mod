module github.com/Netcracker/qubership-apihub/backend/test-service

go 1.27.2

require (
	github.com/Netcracker/qubership-apihub/backend/commons-go v0.0.1
	github.com/gorilla/handlers v1.5.2
	github.com/gorilla/mux v1.8.1
	github.com/sirupsen/logrus v1.10.2
	gopkg.in/natefinch/lumberjack.v2 v2.2.1
)

require (
	github.com/felixge/httpsnoop v1.1.0 // indirect
	golang.org/x/sys v0.49.0 // indirect
)

replace github.com/Netcracker/qubership-apihub/backend/commons-go => ../commons-go
