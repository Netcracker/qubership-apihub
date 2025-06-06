# Qubership APIHUB REST Playground

REST Playground is a UI component for REST API testing, which allows you to send requests to the server using real data. 
It automatically extracts request parameters from the API specification, simplifying the testing process for users.

## Features
- **Automatic Request configuration:** Request parameters are automatically determined based on the API specification, which saves the user from having to manually configure.
- **Support for custom URLs:** If the server URL is not specified in the specification, the user can manually enter their own URL.
- **Limitations:** Playground is intended exclusively for REST operations.
- **Manually configuration:** It's impossible to change set of allowed path and/or query parameters and request headers. You can combine them as it is prescribed by specification, but not modify their names and schemas.
- **CORS:** Helps to circumvent problems with CORS by using requests from the backend.

## Components
Separate web-components:
- **TryIt:** Allows users to send REST requests to the server using data from the API specification. All query parameters are automatically extracted from the specification, which simplifies the testing process.
- **Examples:** Provides examples of requests and responses based on the API specification, which helps users better understand the API structure and usage.

## Storybook
The project uses Storybook to develop and demonstrate interface components in isolation.

### Run Storybook:
```bash
npm run storybook
```

## Modifications
Fork of the [@stoplightio/elements](https://github.com/stoplightio/elements).

TryIt and Examples are extracted as separate web-components
