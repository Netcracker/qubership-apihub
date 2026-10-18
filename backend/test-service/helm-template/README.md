# Qubership APIHUB Test Service Helm Chart

This folder contains `qubership-apihub-test-service` Helm chart for Qubership APIHUB Test Service deployment to k8s cluster.

It is ready for usage Helm chart with no any parameters.

Test service is just an utility for testing of Qubership Agent, so this helm chart is very simple and straightforward.


## Execute helm install

In order to deploy Qubership APIHUB Agent to your k8s cluster execute the following command:

```
helm install qubership-apihub-test-service -n qubership-apihub-test-service --create-namespace -f ./qubership-apihub-test-service/values.yaml ./qubership-apihub-test-service
```

In order to uninstall Qubership APIHUB from your k8s cluster execute the following command:

```
helm uninstall qubership-apihub-test-service -n qubership-apihub-test-service
```