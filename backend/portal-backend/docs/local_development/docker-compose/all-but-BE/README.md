# APIHUB docker-compose for backend debug with the whole APIHUB sub-parts

## Prerequisites

Install **podman** with **compose** plugin.

For PostgreSQL access install PGADmin or any other similar tool.

## Parameters setup

Review *.env files in this folder and fill values for the following ones:

```
APIHUB_API_KEY
```

For database access connect to localhost:5432 postgres/postgres


## Start sub-parts

Execute `podman compose up`

## Launch qubership-apihub-backend from VSC and start your debugging

VSC launch.json example:

```
{
    "version": "0.2.0",
    "configurations": [
    
        {
            "name": "Launch Package",
            "type": "go",
            "request": "launch",
            "mode": "auto",
            "program": "${fileDirname}",
            "env": {
                "LISTEN_ADDRESS": "127.0.0.1:8090",
                "APIHUB_POSTGRESQL_DB_NAME": "apihub_backend",
                "APIHUB_POSTGRESQL_USERNAME": "apihub_backend_user",
                "APIHUB_POSTGRESQL_PASSWORD": "apihub_backend_password",
                "APIHUB_POSTGRESQL_PORT": "5432",
                "PRODUCTION_MODE": "false",
                "JWT_PRIVATE_KEY": "LS0tL...0tLS0NCg==",
                "APIHUB_ADMIN_EMAIL": "x_APIHUB",
                "APIHUB_ADMIN_PASSWORD": "Tmf@c23s"
                "APIHUB_ACCESS_TOKEN": "xyz"
            }
        }
    ]
}
```

## Stop sub-parts

Execute `podman compose down`

## Usage

http://localhost:8080/login
