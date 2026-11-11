# Compare operations, not specifications

APIHUB Portal provides the ability to compare two package versions. During comparison, Portal compares not OpenAPI
specifications from these versions, but separate operation document from these specifications. In APIHUB, one operation
document is a self-contained specification containing information only about the current operation and obtained from the
source specification as follows:

* OpenAPI field value is propagated from source specification
* servers object is propagated from source specification
* security object is propagated from source specification
* path and method of current operation from source specification
* components object is propagated from source specification but only those objects inside components that are used in
  current operation
  * except components.securitySchemes - this object propagated from source specification as is.
* (info object from source specification is ignored and not propagated)

For example, there is OpenAPI specification in package version v1:

**Specification 1:**

```yaml
openapi: 3.0.3
info:
  title: Petstore (pets)
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0.html
  version: 1.0.1
servers:
  - url: https://petstore3.swagger.io/api/v3
paths:
  /pet:
    put:
      tags:
        - pet
      summary: Update an existing pet
      description: Update an existing pet by Id
      operationId: updatePet
      requestBody:
        description: Update an existent pet in the store
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
        required: true
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'         
        '400':
          description: Invalid ID supplied
  /store/order:
    post:
      tags:
        - store
      summary: Place an order for a pet
      description: Place a new order in the store
      operationId: placeOrder
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Order'
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Invalid input
        '422':
          description: Validation exception
components:
  schemas:
    Pet:
      required:
        - name
      type: object
      properties:
        id:
          type: integer
          format: int64
          example: 10
        name:
          type: string
          example: doggie
    Order:
      type: object
      properties:
        id:
          type: integer
          format: int64
        petId:
          type: integer
          format: int64
        quantity:
          type: integer
          format: int32
          example: 7
```

In this case, when user will compare version v1 with some other version, the comparison will not be performed for
initial specification, but for the following two operation documents:

**Operation 1:**

```yaml
openapi: 3.0.3
servers:
  - url: https://petstore3.swagger.io/api/v3
paths:
  /pet:
    put:
      tags:
        - pet
      summary: Update an existing pet
      description: Update an existing pet by Id
      operationId: updatePet
      requestBody:
        description: Update an existent pet in the store
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
        required: true
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'         
        '400':
          description: Invalid ID supplied    
components:
  schemas:
    Pet:
      required:
        - name
      type: object
      properties:
        id:
          type: integer
          format: int64
          example: 10
        name:
          type: string
          example: doggie
```

**Operation 2:**

```yaml
openapi: 3.0.3
servers:
  - url: https://petstore3.swagger.io/api/v3
paths:
  /store/order:
    post:
      tags:
        - store
      summary: Place an order for a pet
      description: Place a new order in the store
      operationId: placeOrder
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Order'
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Invalid input
        '422':
          description: Validation exception
components:
  schemas:
    Order:
      type: object
      properties:
        id:
          type: integer
          format: int64
        petId:
          type: integer
          format: int64
        quantity:
          type: integer
          format: int32
          example: 7
```

## Resolved references in comparison

### External references

If you have OpenAPI file that contains references to other files, which contains appropriate resources, then APIHUB will
resolve such reference during publication. For example, in case below, there are:

* 2 files (getAddressUnitsByName_createAddressUnit.yml, getAddressUnitById.yml) that contain paths objects
* 2 files (AddressUnit.yml, CreateAddressUnitRequest.yml) that contain schemas.
* 1 file common-openapi.yml that contains security schemes.

**Specification 1:**

```yaml
openapi: '3.0.1'
info:
  title: Address Management API
  version: '1.2'
  license:
    name: Apache 2.0
    url: http://www.apache.org/licenses/LICENSE-2.0
servers:
  - url: http://{server}
    variables:
      server:
        default: server:port
tags:
  - name: Address Management API
paths:
  /api/v1/addressManagement/address:
    $ref: 'AddressManagementAPI/Operations/getAddressUnitsByName_createAddressUnit.yml'
  /api/v1/addressManagement/address/{id}:
    $ref: 'AddressManagementAPI/Operations/getAddressUnitById.yml'
components:
  schemas:
    AddressUnit:
      $ref: 'AddressManagementAPI/ResourceModel/AddressUnit.yml'
    CreateAddressUnitRequest:
      $ref: 'AddressManagementAPI/ResourceModel/CreateAddressUnitRequest.yml'
  securitySchemes:
    openId:
      $ref: 'common-openapi.yml#/components/securitySchemes/openId'
security:
  - openId: []
```

When user publishes these 6 files, APIHUB will resolve all external references and in the result there will be published
one file* in the Portal where all content from external links are inserted in this published file. Due to this, if user
changes names of external file (to which there is external link) and external link appropriately, then from APIHUB point
if view no changes were made.

* When publishing via Editor, you can mark your resource files as unpublishable. This allows you to have only one file
  in Portal package version instead of 6 as in example above.

### Internal reference

Internal reference are resolved in the same way as external references, the difference is that external references are
resolved during publication, and after publication user does not these external references. And internal references are
resolved during comparison.

So, if user has OpenAPI file with internal reference as v1 in example below and in another version v2 user changes
schema name from Pet to Pet1 and changes ref in request and response body schema appropriately to
'#/components/schemas/Pet1', then comparing initial v1 and v2, not changes will be calculated.

**v1:**

```yaml
openapi: 3.0.3
servers:
  - url: https://petstore3.swagger.io/api/v3
paths:
  /pet:
    put:
      tags:
        - pet
      summary: Update an existing pet
      description: Update an existing pet by Id
      operationId: updatePet
      requestBody:
        description: Update an existent pet in the store
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
        required: true
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'         
        '400':
          description: Invalid ID supplied  
components:
  schemas:
    Pet:
      title: Pet
      required:
        - name
      type: object
      properties:
        id:
          type: integer
          format: int64
          example: 10
        name:
          type: string
          example: doggie
```

**v2:**

```yaml
openapi: 3.0.3
servers:
  - url: https://petstore3.swagger.io/api/v3
paths:
  /pet:
    put:
      tags:
        - pet
      summary: Update an existing pet
      description: Update an existing pet by Id
      operationId: updatePet
      requestBody:
        description: Update an existent pet in the store
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet1'
        required: true
      responses:
        '200':
          description: Successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet1'         
        '400':
          description: Invalid ID supplied  
components:
  schemas:
    Pet1:
      title: Pet
      required:
        - name
      type: object
      properties:
        id:
          type: integer
          format: int64
          example: 10
        name:
          type: string
          example: doggie
```

## Declarative approach in calculation of changes

Before release 2024.4, APIHUB calculated total number of changes according to effective approach. For example, OAS has
shared object (e.g. schema/parameters/header in "components" object) and this shared object is used in one operation
multiple times (via ref); if one change is made in this object, then number of changes in the operation was equal to the
number of uses of this object. And total number of changes in the version, was calculated just as sum of number of
changes from all operations in the package version. So, if the same shared object is used in N operations, and each
operation uses this object T times, then total number of changes in the package version is equal to C *N* T (where C is
number of changes in shared object). The problem of effective approach is that even one change in shared object can
cause dozens of reported changes in APIHUB, which can be not clear for the user why so many changes were made and how
much will be required to support them.

Starting from release 2024.4, APIHUB calculates changes according to declarative changes - calculate only number of
unique changes (~ number of "changed lines" in specification). In this approach, it does not matter how many times
shared object was used in the operation or how many operations use this object, number of changes in operation/in
package version is always equal to number of changes made in the shared object.

>
> If some change was made in components object (schema, parameters, headers, and so on), but this object is not used in
> any operation, then APIHUB does not calculate such change.

In the example below, shared "Order" schema is used two times in "Place an order for a pet" operation - in request and
response. In v2, a format for the petId parameter was added to the Order scheme. So, when comparing versions v1 and v2,
in the old effective approach, number of changes is two, and in the new declarative approach - number of changes is one.

**v1:**

```yaml
openapi: 3.0.3
servers:
  - url: https://petstore3.swagger.io/api/v3
paths:
  /store/order:
    post:
      tags:
        - store
      summary: Place an order for a pet
      description: Place a new order in the store
      operationId: placeOrder
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Order'
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Invalid input
        '422':
          description: Validation exception
components:
  schemas:
    Order:
      type: object
      properties:
        id:
          type: integer
          format: int64
        petId:
          type: integer
        quantity:
          type: integer
          format: int32
          example: 7
```

**v2:**

```yaml
openapi: 3.0.3
servers:
  - url: https://petstore3.swagger.io/api/v3
paths:
  /store/order:
    post:
      tags:
        - store
      summary: Place an order for a pet
      description: Place a new order in the store
      operationId: placeOrder
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Order'
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: Invalid input
        '422':
          description: Validation exception
components:
  schemas:
    Order:
      type: object
      properties:
        id:
          type: integer
          format: int64
        petId:
          type: integer
          format: int64
        quantity:
          type: integer
          format: int32
          example: 7
```

See more examples with number of changes in declarative approach in Number of declarative changes

>
> Count Effective vs Declarative API Changes:
>
> 1. Declarative changes counting does not change classification (compared to current effective approach), only rescales
>    the numbers.
> Effective changes counting closer to worst case scenario (essentially provide an upper bound for the impact if all
> operations from the package are used by consumer)
> 2. Effective changes counting closer to worst case scenario (essentially provide an upper bound for the impact if all
>    operations from the package are used by consumer)
> 3. Results in inflated number
>       * Large number of essentially the same changes could complicate the impact analysis
> 4. Actual impact of change on API consumer is influenced more by consumer code structure and actual API usage
>       * Impossible to assess on API provider side
>       * Could be easier to assess on API consumer side if declarative changes are reported

## Circular references

If a change occurs in the schema with circular reference, APIHUB counts such change only one time. In the example below,
ChangeOfferingCommonPart schema has parameter that references to ChangeOfferingCommonPart. If some parameter in
ChangeOfferingCommonPart changes, e.g. if "format: NCID" is removed from
ChangeOfferingCommonPart schema, then APIHUB counts only one change, although in reality this causes an infinite number
of changes.

**v1:**

```yaml
openapi: 3.0.1
paths:
  /api/v1/orderManagement/salesOrder/bulkOperation:
    post:
      tags:
        - Bulk Operation
      operationId: bulkOperation
      summary: Bulk Operation
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChangeOfferingCommonPart'
      responses:
        '200':
          description: Ok
components:
  schemas:
    ChangeOfferingCommonPart:
      title: ChangeOfferingCommonPart
      type: object
      properties:
        offeringId:
          type: number
          format: NCID
          description: Specifies POC flat offeringId of product offering which should be added to SO.
        msaItemId:
          type: string
          format: NCID
        offering:
          $ref: '#/components/schemas/ChangeOfferingCommonPart'
```

## No changes in unsupported entities

When comparing two versions of operation, APIHUB checks that operation is written according to OpenAPI specification. If
there are some entities that are not supported in OAS and these entities contain changes when comparing two versions,
then APIHUB does not calculate such changes. For example, OAS3.0 does not support "additionalItems" keyword and if we
compare two versions of operation where, for example, in one version there is no 'additionalItems' in schema and on
another version it was added, then APIHUB will not calculate such changes.

## No changes in explicitly specified default values

Some OpenAPI properties have default values and in general they are not written in specification. For example,
"deprecated" property by default equals to "false" and "additionalProperties" property has "true" default value.

If user makes changes in specification, where he/she explicitly specifies default value of the property, then APIHUB
does not count such change. In the example below, comparison of v1 and v2 will not show any changes.

**v1:**

```yaml

```

**v2:**

```yaml
openapi: 3.0.1
paths:
  /api/v1/orderManagement/salesOrder/bulkOperation:
    post:
      tags:
        - Bulk Operation
      operationId: bulkOperation
      summary: Bulk Operation
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChangeOfferingCommonPart'
      responses:
        '200':
          description: Ok
components:
    ChangeOfferingCommonPart:
      title: ChangeOfferingCommonPart
      type: object
      properties:
        offeringId:
          type: number
          format: NCID
          description: Specifies POC flat offeringId of product offering which should be added to SO.
        msaItemId:
          type: string
          format: NCID
        offering:
```
