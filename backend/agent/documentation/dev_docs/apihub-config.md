# General description
To add an ability to discover files different from supported specification format Apihub support special type of config.  
It's called `Apihub config`, the format was inspired by swagger config and it's almost equals.
The only change is `type` field added.

# Paths
Default Apihub config discovery path is `/v3/api-docs/apihub-swagger-config`

# Schema
Base keys are 
* "configUrl" - URL of the config itself
* "urls" - array of "url" objects.

"url" object contains the following fields:
* "url" - relative path to the file. Apihub agent will request the file by this path.
* "name" - human readable file name (short summary).
* "type" - one of the supported types.

Supported types:
* "rest" - openapi 2.0 or 3.* specification
* "graphql" - graphql specification
* "markdown" - markdown file
* "unknown" - any binary file

# How to enable
steps:
1) add endpoint to the service with path `/v3/api-docs/apihub-swagger-config` or customized one
2) the endpoint should return the json as specified above
3) run discovery in Apihub agent and make sure that all required files are exposed

# Response example
```
{
    "configUrl": "/v3/api-docs/apihub-swagger-config",
    "urls": [
        {
            "url":"/v3/api-docs",
            "name":"Openapi specification"
            "type":"openapi-3-0"
        },
        {
            "url":"/v3/api-docs/admin",
            "name":"Openapi specification for admin operations",
            "x-api-kind":"no-BWC",
            "type":"openapi-3-0"
        },
        {
            "url":"/v3/api-docs/doc1md",
            "name":"Service documentation",
            "x-api-kind":"no-BWC",
            "type": "markdown"
        },
        {
            "url":"/v3/api-docs/doc2md",
            "name":"Service documentation 2",
            "x-api-kind":"no-BWC",
            "type": "markdown"
        }
    ]
}
```