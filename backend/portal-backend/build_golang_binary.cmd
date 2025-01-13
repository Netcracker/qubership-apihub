set GOSUMDB=off
set CGO_ENABLED=0
set GOOS=linux
cd ./qubership-apihub-service
go mod tidy
go mod download
go build .
cd ..