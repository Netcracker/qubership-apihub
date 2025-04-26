# qubership-apihub-test-service

This repository contains a mock microservice specifically designed for testing purposes within the Qubership APIHUB ecosystem. The service doesn't perform any business logic but serves as a comprehensive API specification demonstrator, exposing multiple interface types including REST, GraphQL, and Async APIs through dedicated endpoints.

The endpoint structure strictly follows the Qubership APIHUB Agent discovery contract requirements, enabling seamless integration with the APIHUB ecosystem. This contract defines how services should expose their API specifications for automatic discovery and registration. (Note: The complete contract specification is documented in the Qubership APIHUB Agent repository - see (TODO) in https://github.com/Netcracker/qubership-apihub-agent).

Primary use cases include:

Validating APIHUB Agent's discovery capabilities

Testing specification parsing and processing

Verifying endpoint registration workflows

Simulating multi-protocol API exposure scenarios

The service serves as an essential testing utility for Qubership APIHUB Agent development, providing a controlled environment for verifying agent functionality across different API paradigms and ensuring compliance with the discovery contract requirements.