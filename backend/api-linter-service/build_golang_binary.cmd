set CGO_ENABLED=0
set GOOS=linux
set GOARCH=amd64
set TARGET_GOOS=%GOOS%
set TARGET_GOARCH=%GOARCH%
set GOOS=
set GOARCH=
cd ./qubership-api-linter-service
go run ./tools/download-linter-tools -os=%TARGET_GOOS% -arch=%TARGET_GOARCH%
if errorlevel 1 exit /b 1
set GOOS=%TARGET_GOOS%
set GOARCH=%TARGET_GOARCH%
go mod tidy
if errorlevel 1 exit /b 1
go mod download
if errorlevel 1 exit /b 1
go build .
if errorlevel 1 exit /b 1
cd ..
