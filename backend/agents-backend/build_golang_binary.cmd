set GOSUMDB=off
set CGO_ENABLED=0
set GOOS=linux
set GOARCH=amd64
cd ./qubership-apihub-agents-backend
go mod tidy
if errorlevel 1 exit /b 1
go mod download
if errorlevel 1 exit /b 1
go build .
if errorlevel 1 exit /b 1
cd ..
