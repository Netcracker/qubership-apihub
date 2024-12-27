# Applications to install fo newcomer GO developer 

## 1) Install Git (Git Bash) from software center.
Then ask access to GIT repositories listed in Backend sources section of the [Onboarding](onboarding.md) document.

## 2) Install and setup Podman Desktop or Rancher Desktop (your choice).
This software you need to run APIHUB locally. For more info please see: [Local development](./local_development/local_development.md).

### Install Podman Desktop:


### To Install Rancher Desktop:
* install Rancher Desktop from the website: https://rancherdesktop.io/;
* install WSL Debian from software center because NC deprecate installation from Microsoft servers;
* run Rancher Desktop and be sure it run without errors
* update WSL if needed (run command in Terminal: wsl --update)
* enable Networking tunnels in Rancher Desktop (Preferences -> WSL -> Network)
Now you can run docker-compose up at appropriate docker-compose.yml file.

## 3) Install IntelliJ IDEA Ultimate


## 4) Install postman


## 5) Install pgAdmin or dBeaver
This application you need for local development, when you need to browse and setup Data Base locally from DB backups. For more info please see: [Local development](./local_development/local_development.md).


