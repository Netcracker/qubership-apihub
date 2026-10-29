# DI-Portal-PKGVER-015 Human-readable description for deprecated items for OpenAPI 3.0

**Design Item ID**: DI-Portal-PKGVER-015  
**Design Item Name**: Human-readable description for deprecated items for OpenAPI 3.0  
**Related Design Items**:

- [List of Deprecated Operations](di-portal-pkgver-014-list-of-deprecated-operations.md)

**Related API**:

- Get list of deprecated operations (GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/deprecated)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***

## Description

The functionality allows the user to see the description of deprecated operations and deprecated items. See more about
deprecated operations and items in
[List of Deprecated Operations](di-portal-pkgver-014-list-of-deprecated-operations.md).

- [Operation object](#operation-object)
- [Parameters object](#parameters-object)
- [Headers object](#headers-object)
- [Schema object](#schema-object)

### Operation object

- **Property:** paths.\<endpoint\>.\<method\>.deprecated
- **Human-readable description:** [Deprecated] operation \<method.toUpperCase\> \<endpoint\>
- **Example:** [Deprecated] operation GET /api/v1/users

### Parameters object

Variables:

1. \<in\> is value of attribute 'in' of parameter. Possible values are
   - path
   - query
   - header
   - cookie
2. \<paramPath\> - this variable can have one of the following values:
   - if operation parameter is a ref: '\<in\> parameter \<path to the changed parameter in components\>'; e.g.
     components.parameters.petId
   - if operation parameter is written inline: \<in\> parameter '\<name\>'; e.g. query parameter 'userId'

```yaml
parameters:
  - in: query
    name: userId #this value is <name>
    schema:
      type: integer
```  

=====

- **Property:** ....parameters.[*].deprecated
- **Human-readable description:** [Deprecated] \<paramPath\>
- **Examples:**
  1. ref case:
     - [Deprecated] query parameter 'components.parameters.petId'
  2. inline case:
     - [Deprecated] query parameter 'petId'

### Headers object

Variable:  
\<headerPath\> - can have one of the following values:

- if header is ref (i.e. path starts with "components.headers"): '**header \<path to the deprecated header\>**' , e.g.
  'components.headers.X-Rate-Limit-Limit'.
- if header is written inline but it is used in components (i.e. path starts with "components.responses" or
  "components.requestBodies"): '**header in \<path to the deprecated header**\>', e.g.
  'components.responses.NotFound.content.headers.X-Rate-Limit-Limit'.
- if header is written inline and it is used inline (i.e. path starts with "paths"):
  - if header is response: **header '\<header key\>' in response '**\<response code\>**'**, e.g. header
    'schemas.X-RateLimit-Remaining' in responses '200'
  - if header is in encoding object of response: **header '\<header key\>' in encoding '\<encoding key\>' of response
    '\<response code\>' (\<media type\>)**, e.g. header 'schemas.X-RateLimit-Remaining' in encoding 'profileImage' of
    responses '200' (`application/json`)
  - if header is in encoding object of requestBody: **header '\<header key\>' in encoding '\<encoding key\>' of request
    body (\<media type\>)**, e.g. header 'schemas.X-RateLimit-Remaining' in encoding 'profileImage' of request body
    (`application/json`)

=====

- **Property:** ....headers.\<headerKey\>.deprecated
- **Human-readable description:** [Deprecated] \<headerPath\>
- **Examples:**
  1. example 1 (pure ref case):  
     - [Deprecated] header 'components.headers.X-Rate-Limit'

```yaml
openapi: 3.0.3
info:
  title: test
  version: 1.0
paths:
  /pets:
    get:
      responses:
        '200':
          description: A simple string response
            content:
              text/plain:
                schema:
                  type: string
              headers:
                $ref: '#/components/headers/X-Rate-Limit-Limit'
components:
  headers:
    X-Rate-Limit-Limit:
      deprecated: true
      schema:
        type: integer
```

  1. example 2 (pure ref case):  
     - [Deprecated] header 'X-RateLimit-Remaining' in response '200'  

```yaml
openapi: 3.0.3
info:
  title: test
  version: 1.0
paths:
  /pets:
    get:
      responses:
        '200':
          description: A simple string response
            content:
              text/plain:
                schema:
                  type: string
              headers:
                X-Rate-Limit-Limit:
                deprecated: true
                  schema:
                    type: integer
```

  1. example 3:  
     - [Deprecated] header 'X-Rate-Limit' in encoding 'profileImage' of request body (multipart/form-data)

```yaml
openapi: 3.0.3
info:
  title: test
  version: 1.0
paths:
  /pets:
    post:
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
                properties:
                  profileImage: {}
            encoding:
              profileImage:
                contentType: image/png, image/jpeg
                headers:
                  X-Rate-Limit:
                    deprecated: true
                    schema:
                      type: integer
```

  1. example 4:  
     - [Deprecated] header 'X-Rate-Limit' in encoding 'profileImage' of response '200' (`application/json`)

```yaml
openapi: 3.0.3
info:
  title: test
  version: 1.0
paths:
  /pets:
    get:
      responses:
        '200':
          description: Ok
            content:
              application/json:
                schema:
                  type: object
                  properties:
                    profileImage: {}
                encoding:
                  profileImage:
                    contentType: image/png, image/jpeg
                    headers:
                      X-Rate-Limit:
                        deprecated: true
                        schema:
                          type: integer
```

  1. example 5:  
     - [Deprecated] header in 'components.responses.NotFound.content.encoding.profileImage.headers.X-Rate-Limit'  

```yaml
openapi: 3.0.3
info:
  title: test
  version: 1.0
paths:
  /pets:
    get:
      responses:
        '200':
          $ref: '#/components/responses/NotFound'
 
components:
  responses:
    NotFound:
      description: not found
        content:
          application/json:
            schema:
              type: object
              properties:
                profileImage: {}
          encoding:
            profileImage:
              contentType: image/png, image/jpeg
              headers:
                X-Rate-Limit:
                  deprecated: true
                  schema:
                    type: integer
```

### Schema object  

Variables:

1. \<deprecationPath\> (applicable when deprecation path starts with "paths") = path to the deprecation starting with
   word schema. E.g. 'schema.properties.petId'
2. \<schema path\>:
   - if schema is ref (i.e. path starts with "components.schemas"): **\<path to the changed parameter in components\>**,
     e.g. 'components.schemas.Pet.properties.petId'
   - if schema is written inline but it is used in components (i.e. path starts with "components.responses",
     "components.headers", "components.parameters", "components.requestBodies"): **\<path to the deprecation\>**, e.g.
     'components.responses.NotFound.schema' or 'components.responses.NotFound.schema.properties.prop1'
   - if schema is written inline and it is used inline (i.e. path starts with "paths"), then:
     - if schema is in response: \<deprecationPath\> in response '**\<response code\>**' (\<media type\>). E.g. schema
       in 'response 200' (`application/json`) or schema.properties.Id in 'response 200' (`application/json`)
     - if schema is in request body: **\<deprecationPath\> in request body (\<media type\>)**. E.g. schema in request
       body (`application/json`) or schema.properties.Id in request body (`application/json`)
     - if schema is in parameter: **\<deprecationPath\> in \<in> parameter '\<name\>'**. E.g. schema in query parameter
       'limit' or schema.properties.Id in query parameter 'limit'
     - if schema is in header of response: **\<deprecationPath\> in header '\<header key\>' of response '\<response
       code\>'**. E.g. schema in header 'x-rate-limit' of 'response 200' or schema.properties.Id in header
       'x-rate-limit' of 'response 200'
     - if schema is in header of encoding object of response: **\<deprecationPath> in header '\<header key\>' of
       encoding '\<encoding key\>' of response '\<response code\>' (\<media type\>)**.
     - if schema is in header of encoding object of requestBody: **\<deprecationPath\> in header '\<header key\>' of
       encoding '\<encoding key\>' of request body (\<media type\>)**.

====

- **Property:**
  - schema.deprecated
  - schema.properties.[\<propertyKey\>].deprecated
  - schema.properties...properties.[\<propertyKey\>].deprecated
- **Human-readable description:** [Deprecated] \<schema path\>
- **Examples:**
  1. example 1 (pure ref case):
     - [Deprecated] 'components.schemas.Pet'.

```yaml
openapi: 3.0.3
info:
  title: test
  version: 1.0
paths:
  /pets:
    get:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
components:
  schemas:
    Pet:
      type: string
      deprecated: true
```

  1. example 2 (pure inline case):
     - [Deprecated] schema in response '200' (`application/json`)

```yaml
openapi: 3.0.3
info:
  title: test
  version: 1.0
paths:
  /pets:
    get:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: string
                deprecated: true
```

  1. example 3
     - [Deprecated] schema 'schema.properties.petId' in request body (`application/json`).

```yaml
openapi: 3.0.3
info:
  title: test
  version: 1.0
paths:
  /pets:
    post:
      requestBodies:
        content:
          application/json:
            schema:
              type: object
              properties:
                petId:
                  type: string
                  deprecated: true
      responses:
        '200':
          description: OK
```

  1. example 4 (mixed case - inline schema in ref):
     - [Deprecated] schema in 'components.responses.NotFound.schema'
     - [Deprecated] schema in 'components.headers.HeaderRef.schema'
     - [Deprecated] schema in 'components.parameters.schema.properties.prop1'
     - [Deprecated] schema in 'components.requestBodies.CreatePet.schema.properties.oldName'.
