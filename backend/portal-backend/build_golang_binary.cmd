set CGO_ENABLED=0
set GOOS=linux
set GOARCH=amd64
go mod tidy
if errorlevel 1 exit /b 1
go mod download
if errorlevel 1 exit /b 1
go build -o qubership-apihub-service .
if errorlevel 1 exit /b 1
