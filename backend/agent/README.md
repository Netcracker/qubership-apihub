# qubership-apihub-agent

qubership-apihub-agent is a golang application (microservice) providing the following features:

- Designed for k8s deployment, requires ClusterView permissions
- Using k8s API able to execute REST calls to any service
- Discovers API specificiations (OpenAPI, GQL) exposed by services
- Integrates with Qubership-APIHUB application via special plug-in - [qubership-apihub-agents-backend](https://github.com/Netcracker/qubership-apihub-agents-backend) which is included into default Qubsership-APIHUB delivery

## Arch diagramm

Please refer to Qubership-APIHUB Wiki [pages](https://github.com/Netcracker/qubership-apihub/wiki).

## API specification disovery process and contracts

Please refer to [design document](/documentation/discovery_algorithm.md)

## Installation

Qubership APIHUB Agent is designed to work in k8s cluster only.
Deployment to k8s is possible via Helm Chart. Please refer to [Installation Notes](./helm-templates/README.md)

## Build

Just run build.cmd(sh) file from this repository
