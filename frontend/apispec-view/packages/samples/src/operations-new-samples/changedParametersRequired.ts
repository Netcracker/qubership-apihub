export namespace ChangedParametersRequired {
  export const BEFORE = {
    "openapi": "3.0.3",
    "servers": [
      {
        "url": "https://{server}.example.com",
        "description": "Service server",
        "variables": {
          "server": {
            "description": "Name of the APIHUB server.",
            "enum": [
              "production",
              "dev.server",
              "staging.server"
            ],
            "default": "apihub"
          }
        }
      }
    ],
    "security": [
      {
        "BearerAuth": []
      },
      {
        "api-key": []
      }
    ],
    "paths": {
      "/system/info": {
        "get": {
          "x-api-kind": "experimental",
          "x-custom-tag1": "custom-tag-1",
          "x-custom-tag2": "custom-tag-2",
          "x-custom-tag3": "custom-tag-3",
          "tags": [
            "Tag#1",
            "Tag$2",
            "Tag%3"
          ],
          "summary": "SUMMARY of operation",
          "description": "DESCRIPTION of operation",
          "operationId": "getInfo",
          "externalDocs": {
            "description": "Find out more about mysystem",
            "url": "http://shmagger.io"
          },
          "parameters": [
            {
              "name": "param1",
              "in": "query",
              "description": "Decription of param1",
              "required": true,
              "schema": {
                "type": "string",
                "format": "uri",
                "example": "https://api.example.com/portal"
              },
              "allowEmptyValue": true
            },
            {
              "name": "param2",
              "in": "query",
              "description": "Decription of param2",
              "required": true,
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            },
            {
              "name": "param3",
              "in": "header",
              "description": "Decription of param3",
              "schema": {
                "type": "string",
                "format": "uri",
                "example": "https://api.example.com/portal"
              }
            },
            {
              "name": "param4",
              "in": "header",
              "description": "Decription of param4",
              "required": true,
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            },
            {
              "name": "param5",
              "in": "path",
              "description": "Decription of param5",
              "required": true,
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            },
            {
              "name": "param6",
              "in": "path",
              "description": "Decription of param6",
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            },
            {
              "name": "param7",
              "in": "cookie",
              "description": "Decription of param7",
              "required": true,
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            },
            {
              "name": "param8",
              "in": "cookie",
              "description": "Decription of param8",
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Successful execution",
              "links": {
                "nextOperation": {
                  "operationId": "updatePet"
                }
              },
              "headers": {
                "resp-header": {
                  "description": "The number of allowed requests in the current period",
                  "schema": {
                    "type": "integer"
                  }
                }
              },
              "content": {
                "application/json": {
                  "schema": {
                    "description": "Information about the API HUB product",
                    "type": "object",
                    "properties": {
                      "backendVersion": {
                        "description": "Current backend version",
                        "type": "string",
                        "example": "main-20220727.092034-53"
                      },
                      "frontendVersion": {
                        "description": "Current frontend version",
                        "type": "string",
                        "example": "0.2.2-20220725071210"
                      },
                      "productionMode": {
                        "description": "Production environment flag"
                      }
                    }
                  },
                  "examples": {
                    "SystemInfo": {
                      "description": "Example of the system description",
                      "value": {
                        "version": "0.1.0",
                        "contacts": [
                          {
                            "name": "Admin",
                            "contact": "admin@example.com"
                          }
                        ]
                      }
                    }
                  }
                }
              }
            },
            "500": {
              "description": "Internal server error",
              "content": {
                "application/json": {
                  "schema": {
                    "description": "An error description",
                    "type": "object",
                    "properties": {
                      "status": {
                        "description": "HTTP Status Code",
                        "type": "number"
                      },
                      "code": {
                        "description": "Internal string error code. Mandatory in response.",
                        "type": "string",
                      },
                      "message": {
                        "description": "The attribute contains an error message.",
                        "type": "string"
                      },
                      "params": {
                        "type": "object",
                        "description": "Message parameters",
                        "example": {
                          "id": 12345,
                          "type": "string"
                        }
                      },
                      "debug": {
                        "description": "The attribute contains debug details (e.g. stack-trace). Presented in the error response only on Dev/Test environments if corresponding logging level is enabled.",
                        "type": "string"
                      }
                    },
                    "required": [
                      "status",
                      "code",
                      "message"
                    ]
                  }
                }
              }
            }
          },
          "security": [
            {
              "BearerAuth": null
            },
            {
              "api_key": null
            }
          ]
        }
      }
    },
    "components": {
      "securitySchemes": {
        "petstore_auth": {
          "type": "oauth2",
          "flows": {
            "implicit": {
              "authorizationUrl": "https://petstore3.swagger.io/oauth/authorize",
              "scopes": {
                "write:pets": "modify pets in your account",
                "read:pets": "read your pets"
              }
            }
          }
        },
        "api_key": {
          "type": "apiKey",
          "name": "api_key",
          "in": "header"
        },
        "BearerAuth": {
          "type": "http",
          "description": "Common secutity scheme for API usage",
          "scheme": "bearer",
          "bearerFormat": "JWT"
        },
        "BasicAuth": {
          "type": "http",
          "description": "Login/password authentication",
          "scheme": "basic"
        }
      }
    }
  };

  export const AFTER = {
    "openapi": "3.0.3",
    "servers": [
      {
        "url": "https://{server}.example.com",
        "description": "Service server",
        "variables": {
          "server": {
            "description": "Name of the APIHUB server.",
            "enum": [
              "production",
              "dev.server",
              "staging.server"
            ],
            "default": "apihub"
          }
        }
      }
    ],
    "security": [
      {
        "BearerAuth": []
      },
      {
        "api-key": []
      }
    ],
    "paths": {
      "/system/info": {
        "get": {
          "x-api-kind": "experimental",
          "x-custom-tag1": "custom-tag-1",
          "x-custom-tag2": "custom-tag-2",
          "x-custom-tag3": "custom-tag-3",
          "tags": [
            "Tag#1",
            "Tag$2",
            "Tag%3"
          ],
          "summary": "SUMMARY of operation",
          "description": "DESCRIPTION of operation",
          "operationId": "getInfo",
          "externalDocs": {
            "description": "Find out more about mysystem",
            "url": "http://shmagger.io"
          },
          "parameters": [
            {
              "name": "param1",
              "in": "query",
              "description": "Decription of param1",
              "schema": {
                "type": "string",
                "format": "uri",
                "example": "https://api.example.com/portal"
              },
              "allowEmptyValue": true
            },
            {
              "name": "param2",
              "in": "query",
              "description": "Decription of param2",
              "required": true,
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            },
            {
              "name": "param3",
              "in": "header",
              "description": "Decription of param3",
              "schema": {
                "type": "string",
                "format": "uri",
                "example": "https://api.example.com/portal"
              }
            },
            {
              "name": "param4",
              "in": "header",
              "description": "Decription of param4",
              "required": true,
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            },
            {
              "name": "param5",
              "in": "path",
              "description": "Decription of param5",
              "required": true,
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            },
            {
              "name": "param6",
              "in": "path",
              "description": "Decription of param6",
              "required": true,
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            },
            {
              "name": "param7",
              "in": "cookie",
              "description": "Decription of param7",
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            },
            {
              "name": "param8",
              "in": "cookie",
              "description": "Decription of param8",
              "required": true,
              "deprecated": true,
              "schema": {
                "type": "integer",
                "format": "int32",
                "example": 1212121
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Successful execution",
              "links": {
                "nextOperation": {
                  "operationId": "updatePet"
                }
              },
              "headers": {
                "resp-header": {
                  "description": "The number of allowed requests in the current period",
                  "schema": {
                    "type": "integer"
                  }
                }
              },
              "content": {
                "application/json": {
                  "schema": {
                    "description": "Information about the API HUB product",
                    "type": "object",
                    "properties": {
                      "backendVersion": {
                        "description": "Current backend version",
                        "type": "string",
                        "example": "main-20220727.092034-53"
                      },
                      "frontendVersion": {
                        "description": "Current frontend version",
                        "type": "string",
                        "example": "0.2.2-20220725071210"
                      },
                      "productionMode": {
                        "description": "Production environment flag"
                      }
                    }
                  },
                  "examples": {
                    "SystemInfo": {
                      "description": "Example of the system description",
                      "value": {
                        "version": "0.1.0",
                        "contacts": [
                          {
                            "name": "Admin",
                            "contact": "admin@example.com"
                          }
                        ]
                      }
                    }
                  }
                }
              }
            },
            "500": {
              "description": "Internal server error",
              "content": {
                "application/json": {
                  "schema": {
                    "description": "An error description",
                    "type": "object",
                    "properties": {
                      "status": {
                        "description": "HTTP Status Code",
                        "type": "number"
                      },
                      "code": {
                        "description": "Internal string error code. Mandatory in response.",
                        "type": "string",
                      },
                      "message": {
                        "description": "The attribute contains an error message.",
                        "type": "string"
                      },
                      "params": {
                        "type": "object",
                        "description": "Message parameters",
                        "example": {
                          "id": 12345,
                          "type": "string"
                        }
                      },
                      "debug": {
                        "description": "The attribute contains debug details (e.g. stack-trace). Presented in the error response only on Dev/Test environments if corresponding logging level is enabled.",
                        "type": "string"
                      }
                    },
                    "required": [
                      "status",
                      "code",
                      "message"
                    ]
                  }
                }
              }
            }
          },
          "security": [
            {
              "BearerAuth": null
            },
            {
              "api_key": null
            }
          ]
        }
      }
    },
    "components": {
      "securitySchemes": {
        "petstore_auth": {
          "type": "oauth2",
          "flows": {
            "implicit": {
              "authorizationUrl": "https://petstore3.swagger.io/oauth/authorize",
              "scopes": {
                "write:pets": "modify pets in your account",
                "read:pets": "read your pets"
              }
            }
          }
        },
        "api_key": {
          "type": "apiKey",
          "name": "api_key",
          "in": "header"
        },
        "BearerAuth": {
          "type": "http",
          "description": "Common secutity scheme for API usage",
          "scheme": "bearer",
          "bearerFormat": "JWT"
        },
        "BasicAuth": {
          "type": "http",
          "description": "Login/password authentication",
          "scheme": "basic"
        }
      }
    }
  }
}