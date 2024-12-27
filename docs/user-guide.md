# Qubership APIHUB User Guide

## API Registry

The API Registry acts as a centralized repository for the storage and management of API data. It supports a nested structure consisting of workspaces, groups, packages and dashboards, offering a comprehensive ecosystem for organizing, tracking, and management of APIs. 

### Registry entities

| Term  |  Decription |
| ----- | ----------- |
| Workspace | Workspaces provide a logical separation for different projects, teams, or departments within the organization. They enable the grouping of related APIs and provide a hierarchical structure for better organization and management. |
| Group | Within a workspace, groups help further categorize APIs based on functional domains or specific areas of focus. Groups provide a flexible way to organize APIs and make them easily discoverable within the API Management portal. |
| Package | Package act as container for APIs related to specific Service/Application. |
| Dashboards (Virtual Packages) | In addition to the standard packages, the Registry also supports virtual packages named as dashboards. Dashboards serve as a higher level of abstraction and can group APIs from complex applications that consist of multiple services. Unlike regular packages, dashboard versions do not contain API data; instead, they provide links to published packages or other dashboards. This level of abstraction allows for a more streamlined and organized view of APIs within the portal. |
| Version | Both packages and dashboards can have multiple versions, each corresponding to different iterations of services or applications. These versions may carry different statuses, such as "release," "draft," or "archived," indicating the lifecycle stage of the APIs contained within the package. |
| Document | All files published to a package are processing by an internal builder service. This processing involves validation and transformation into a unified format, making them available as documents within the package. These documents capture all relevant information about the APIs, and they are further divided into individual API operations for easy reference. |
| API Operation	| API Operation is a fundamental registry entity that defines the API contract for a single operation. These operations can be accessed in various formats, including Documentation, Graphical (Roadmap), or Raw format. |

## Builder service

The Builder component is responsible for the publication of packages in the API Registry. It ensures the successful completion of several steps in the publication process:

1. Resolve External References: The Builder resolves external references in API documents, specifically applicable for Swagger, OpenAPI, and AsyncAPI files. This step ensures that all references within the documents are resolved and properly linked, enabling a comprehensive and unified view of the APIs.
1. Build API Operations List: The Builder extracts and builds an API operations list in a unified format from the input documents. It captures all relevant information about the operations, such as endpoints, request and response structures, and associated metadata.
1. Generate Deprecation List: The Builder generates a deprecation list for all API operations. It identifies any deprecated operations and highlights them within the documentation. This information helps API consumers stay informed about deprecated functionalities and plan for migration to newer alternatives.
1. Classify Changes: The Builder classifies the changes detected during the comparison process into different types. These types include Breaking Changes, Non-breaking Changes, and Annotation Changes. This classification aids in highlighting the nature and significance of the changes, allowing API consumers to assess the potential impact on their existing implementations.
1. Generate Human-readable Change Log: The Builder compares the API operations with the previous version and generates a human-readable change log. This change log provides an overview of the modifications made to the APIs, including additions, modifications, and removals. It helps API consumers understand the differences between API versions and the impact of those changes on their integrations.
1. Store Package in API Registry: Once the above steps are completed, the Builder stores the package, along with the generated documentation and metadata, in the API Registry. This ensures that the published package is available for consumption within the API Management portal.

### Supported files

The Builder component supports various types of documents as input for publication. These include **Swagger**, **OpenAPI**, **GraphQL schema**, **GraphQL introspection**, and **AsyncAPI (Roadmap)**. The Builder can seamlessly process these input document formats, ensuring compatibility and flexibility for a wide range of API technologies.

## Registry UI (Web Portal)

The Registry UI provides a user-friendly interface for working with API Documentation stored in the API Registry. It offers a range of features and functionalities to enhance the user experience and facilitate efficient interaction with the API documentation.

- View API Documentation: The Web Portal allows users to view API documentation for various services and applications. It provides a centralized platform to access and explore detailed information about APIs, including endpoints, request/response structures, authentication requirements, and other relevant documentation.
- Explore API Changes: Users can easily explore API changes through the Web Portal. It provides tools and visualizations that highlight modifications, additions, and removals in API versions. This helps API consumers stay up-to-date with the latest changes and adapt their integrations accordingly.
- View Deprecated APIs: The Web Portal enables users to identify and view deprecated APIs. It clearly indicates APIs that are no longer recommended for use, allowing consumers to transition to alternative functionalities or versions.
- Compare Versions: Users can compare specific versions of services and applications through the Web Portal. This feature allows them to analyze the differences between API versions, including breaking changes, non-breaking changes, and annotations. It aids in understanding the impact of version updates on existing integrations.
- Export Offline API Documentation: The Web Portal supports the export of API documentation for offline usage. Users can generate downloadable versions of the documentation, including all relevant information and details. This feature ensures accessibility and availability of documentation even in offline environments.
- Search Functionality: The Web Portal includes a powerful search feature that allows users to search for specific API documentation. Users can search by keywords, API names, endpoints, or any other relevant information. The search functionality helps users quickly locate the required API documentation within the portal.