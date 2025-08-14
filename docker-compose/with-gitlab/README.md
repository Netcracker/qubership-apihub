# APIHUB docker-compose for local deployment with GitLab integration

This compose file is based on `apihub-generic` compose file but also includes GitLab in it.

## Prerequisites

Install **podman** with **compose** plugin.

**NOTE:** WA for Windows and podman required: you need to add the following line into your `hosts` file: `127.0.0.1 host.docker.internal`

## Parameters setup

As in `apihub-generic` folder, some credential must be generated and filled before first run.
You can use `generate_env.sh` script to do it automatically

## GitLab integration setup

Some manual action required:

1. After `podman compose up` go to `gitlab` container terminal and execute `cat /etc/gitlab/initial_root_password` to get root password for GitLab
2. GitLab is accessible on https://localhost:8443
3. Log in to GitLab under `root` user and go to https://localhost:8443/admin/applications
4. You need to create new application with the following settings:
- Name = apihub
- Redirect URI = http://host.docker.internal:8081/login/gitlab/callback
- Trusted = true
- Confidential = true
- Scopes = api, read_api, read_user, read_repository, write_repository
5. You will get `Application ID` and `Secret` values
6. Paste them to `qubership-apihub-backend-config.yaml` file to `editor.clientId` and `editor.clientSecret` properties
7. Re-run compose (`podman compose down && podman compose up`)
8. Editor will work now