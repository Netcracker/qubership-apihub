**Design Item ID**: DI-Portal-PKGVER-011  
**Design Item Name**: List of Operations  
**Related Design Items**:  
  - [DI-Portal-PKGVER-007: Search and Filter Operations](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90007-Search-and-Filter-Operations)  
  - [DI-Portal-PKGVER-008: Export List of Operation in Excel](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90008-Export-List-of-Operations-in-Excel) 

**Related API**:  
  - Get list of operations (GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/operations)  
  - Export operations to xlsx file (GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/export/operations)

**Revision History:**  

| Date           | Description                         |
| -------------- | ----------------------------------- |
|||

***
# Description
The functionality provides a user with the ability to view list of all REST/GrahpQL operations of the selected package version.  
Portal collects all operations from all OpenAPI/GraphQL specifications published in the current package version.  

**OpenAPI:**  
If package version has 2 OpenAPI specifications:
<details>
  <summary><strong>Specification 1</strong> (Click to expand)</summary>

  <pre>
  <code class="language-yaml">
  openapi: 3.0.3
  info:
    title: Petstore (pets)
    license:
      name: Apache 2.0
      url: http://www.apache.org/licenses/LICENSE-2.0.html
    version: 1.0.1
  tags:
    - name: pet
      description: Everything about your Pets
  paths:
    /pet:
      put:
        x-deprecation-reason: >-
        New version of API is created
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
          '404':
      post:
        x-deprecation-reason: >-
        New version of API is created
        tags:
          - pet
        summary: Add a new pet to the store
        description: Add a new pet to the store
        operationId: addPet
        requestBody:
          description: Create a new pet in the store
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
            description: Invalid input
          '422':
            description: Validation exception
    /pet/findByStatus:
      get:
        tags:
          - pet
        summary: Finds Pets by status
        description: Multiple status values can be provided with comma-separated strings
        operationId: findPetsByStatus
        parameters:
          - name: status
            in: query
            description: Status values that need to be considered for filter
            required: false
            explode: true
            schema:
              type: string
              default: available
              enum:
                - available
                - pending
                - sold
        responses:
          '200':
            description: Successful operation
            content:
              application/json:
                schema:
                  type: array
                  items:
                    $ref: '#/components/schemas/Pet'
          '400':
            description: Invalid status value
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
  </code>
  </pre>
</details>

<details>
  <summary><strong>Specification 2</strong> (Click to expand)</summary>

  <pre>
  <code class="language-yaml">
  openapi: 3.0.3
  info:
    title: Petstore (orders)
    license:
      name: Apache 2.0
      url: http://www.apache.org/licenses/LICENSE-2.0.html
    version: 1.0.1
  tags:
    - name: pet
      description: Everything about your Pets
  paths:
    /store/order:
      post:
        tags:
          - store
        summary: Place an order for a pet
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
  components:
    schemas:
      Order:
        type: object
        properties:
          id:
            type: integer
            format: int64
            example: 10
          petId:
            type: integer
            format: int64
            example: 198772
          complete:
            type: boolean
  </code>
  </pre>
</details>

In this case, Portal stores 4 operations, which will be displayed in API Operations page:
- Update an existing pet (PUT /pet)  
- Add a new pet to the store (POST /pet)  
- Finds Pets by status (GET /pet/findByStatus)  
- Place an order for a pet (POST /store/order)  

**GraphQL:**  
In Portal, GraphQL operation is one instance of root operation type. For example, if package version has 2 OpenAPI specifications:

<details>
  <summary><strong>Specification 1</strong> (Click to expand)</summary>

  <pre>
  <code class="language-graphql">
  type Query {
    """ The operation allows get a Payment Method"""
    getPaymentMethodCore(
      """ Unique identifier of the Payment Method"""
      id: String!
      includeDeleteEntities: Boolean
    ): PaymentMethodCore

    """ The operation allows get a Payment Method Specification."""
    getPaymentMethodSpecificationCore(
      """Type of the Payment Method Specification."""
      type: String!
    ): PaymentMethodSpecificationCore
  }

  type PaymentMethodCore {
    """The date and time when method was deleted"""
    deletedTimestamp: DateTime @deprecated(reason: "According to the ACM design")

    """Description of the payment method"""
    description: String
  }

  type PaymentMethodSpecificationCore {
    """Description of the entity"""
    description: String

    """Type of the Payment Method(e.g. Cash, Voucher etc.)"""
    type: String

    """Unique identifier of the Payment Method Specification."""
    id: String
  }
  </code>
  </pre>
</details>

<details>
  <summary><strong>Specification 2</strong> (Click to expand)</summary>

  <pre>
  <code class="language-graphql">
  """Is used as response type to delete operations."""
  scalar Void

  type Mutation {
    """This operation updates a payment method specification."""
    updatePaymentMethodSpecificationCore(
      """Type of the Payment Method"""
      type: String!

      """Updating parameters."""
      input: PaymentMethodSpecificationCoreInput!
    ): PaymentMethodSpecificationCore

    """This operation deletes a payment method specification."""
    deletePaymentMethodSpecificationCore(
      """Type of the Payment Method."""
      type: String!
    ): Void
  }
  </code>
  </pre>
</details>

In this case Portal stores 3 operations:  
- getPaymentMethodCore (query)  
- getPaymentMethodSpecificationCore (query)  
- updatePaymentMethodSpecificationCore (mutation)

# Start Point  
1. User navigates to APIHUB Portal → workspace → group → package version

# Execution  
1. User opens API Operations tab.
2. The system opens the API Operations page and displays a list of all operations.  
   - API to show list of operations - GET /api/v2/packages/{packageId}/versions/{version}/{apiType}/operations:  
     - apiType = \<current API type>  
     - packageId = \<current package id>  
     - version = \<current package version>

The system shows the following information in the table for REST operations:  
  - Endpoint - shows operation summary, path and method from OpenAPI specification.  
  - Tag - shows list of tags specified for the operation in OpenAPI specification.  
  - Kind - backward-compatibility kind of operation. See Publish no-BWC API.  
  - Custom Metadata - list of OpenAPI extensions (x-...) defined at the operation level in the specification.  

The system shows the following information in the table for GraphQL operations:  
- Endpoint - shows operation title, method name and operation type (query/mutation/subscription). Operation title is generated automatically (since GraphQL does not have appropriate info) by adding spaces in method name before capitalized words.  
- Tag - shows operation type.  
- Kind - backward-compatibility kind of operation. See API Kind

If package version contains both REST and GraphQL operations, then API Operations page will display API type selector. Otherwise, API type selector is not visible.

User can switch between list and detailed view. List view shows list of all operations with information specified above. Detailed view allows user to see preview of operation content:  
1. User clicks **Detailed View**.  
2. The system opens right panel with operation content and only Endpoint column is displayed.  
3. User clicks on row with any operation (any place in the row except title, otherwise another page will be opened).  
4. The system shows operations preview for the selected operation.  
5. User clicks **List View**.  
6. The system closes right panel with operation preview. All table columns are displayed.  

Current list/detailed view state is persisted in current session. By default, list view is selected.

User can filter and search operations, see [DI‐Portal‐PKGVER‐007: Search and Filter Operations
](https://github.com/Netcracker/qubership-apihub/wiki/DI%E2%80%90Portal%E2%80%90PKGVER%E2%80%90007-Search-and-Filter-Operations)

# Screen View
tbd